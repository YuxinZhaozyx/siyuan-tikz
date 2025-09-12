import * as editor from './editor.js'
import { getBlockAttrsAPI, setBlockAttrsAPI, getPageElement } from './api.js';

function lock() {
    return new Promise((resolve) => {
        const element = getPageElement();
        if (!element.dataset.rending_tikz) {
            element.dataset.rending_tikz = 'true';
            resolve();
            return;
        }

        const interval_id = setInterval(() => {
            if (!element.dataset.rending_tikz) {
                clearInterval(interval_id);
                element.dataset.rending_tikz = 'true';
                resolve();
            }
        }, 10);
    });
}

function unlock() {
    const element = getPageElement();
    element.dataset.rending_tikz = '';
}

function unicodeToBase64(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return btoa(String.fromCharCode(...bytes));
}

function base64ToUnicode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

async function load() {
    const attrs = await getBlockAttrsAPI();
    if (attrs['custom-latex-code']) {
        editor.setValue(attrs['custom-latex-code']);
    }
    if (attrs['custom-scale-factor']) {
        document.getElementById('scale-factor').value = attrs['custom-scale-factor'];
    }
}

async function save() {
    const attrs = {}
    attrs['custom-latex-code'] = await editor.getValue();
    attrs['custom-scale-factor'] = document.getElementById('scale-factor').value;
    setBlockAttrsAPI(attrs);
}

async function saveImageAndFrameStyle(img_html, frame_style) {
    const attrs = {}
    attrs['custom-img-html'] = img_html;
    attrs['custom-frame-style'] = frame_style;
    setBlockAttrsAPI(attrs);
}

async function loadImageAndFrameStyle() {
    const attrs = await getBlockAttrsAPI();
    if (attrs['custom-img-html']) {
        showPanel('display-panel');
        document.getElementById('tikz-container').innerHTML = base64ToUnicode(attrs['custom-img-html']);
        if (attrs['custom-frame-style']) changeFrameStyle(attrs['custom-frame-style']);
        return true;
    }
    return false;
}

let first_load_edit_panel = true;
async function showPanel(panel) {
    for (const panel_name of ['edit-panel', 'display-panel']) {
        document.getElementById(panel_name).style.display = (panel_name == panel ? 'flex' : 'none');
    }
    if (panel == 'edit-panel') {
        changeFrameStyle(edit_panel_frame_style);
    }
    if (panel == 'edit-panel' && first_load_edit_panel) {
        first_load_edit_panel = false;
        await load();
    }
}

async function display(show_error_message = true) {
    const width = 75;
    const height = 75;
    const loading_svg = document
        .createRange()
        .createContextualFragment(
            '<svg version="1.1" ' +
            'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
            `width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}">` +
            `<rect width="${width}" height="${height}" rx="5pt" ry="5pt" ` +
            'fill="#000" fill-opacity="0.2"/>' +
            `<circle cx="${width / 2}" cy="${height / 2}" r="15" stroke="#f3f3f3" ` +
            'fill="none" stroke-width="3"/>' +
            `<circle cx="${width / 2}" cy="${height / 2}" r="15" stroke="#3498db80" ` +
            'fill="none" stroke-width="3" stroke-linecap="round">' +
            '<animate attributeName="stroke-dasharray" begin="0s" dur="2s" ' +
            'values="56.5 37.7;1 93.2;56.5 37.7" keyTimes="0;0.5;1" repeatCount="indefinite">' +
            '</animate>' +
            '<animate attributeName="stroke-dashoffset" begin="0s" dur="2s" ' +
            'from="0" to="188.5" repeatCount="indefinite"></animate></circle>' +
            '</svg>'
        ).firstChild;
    document.getElementById('tikz-container').replaceChildren(loading_svg);
    showPanel('display-panel');

    await lock();

    const tikz_element = document.createElement('script');
    tikz_element.type = 'text/tikz';
    tikz_element.textContent = await editor.getValue();
    document.getElementById('tikz-container').replaceChildren(tikz_element)

    try {
        if (tikz_element.textContent.trim().length == 0) {
            throw new Error("代码为空")
        }
    } catch (error) {
        if (show_error_message) {
            document.getElementById("error-message").innerText = error.message;
            document.getElementById("error-modal").style.display = "block";
        }
        unlock();
        showPanel('edit-panel');
        return;
    }
    showPanel('display-panel');
}

let edit_panel_frame_style = window.frameElement.style;
function changeFrameStyle(style) {
    const old_style = window.frameElement.style;
    window.frameElement.style = style;
    return old_style;
}

window.onload = async function () {
    const preview_loaded = await loadImageAndFrameStyle();
    if (!preview_loaded) {
        await showPanel('edit-panel');
        display(false);
    }
}

document.getElementById('display').onclick = async function () {
    save();
    display();
}

document.getElementById('edit').onclick = async function () {
    showPanel('edit-panel');
}

document.addEventListener('tikzjax-render-finished', function (event) {
    if (event.detail.status == "error") {
        console.log(event.detail.message)
        showPanel('edit-panel');
        document.getElementById("error-message").innerText = event.detail.message;
        document.getElementById("error-modal").style.display = "block";

        saveImageAndFrameStyle('', '');
    }
    if (event.detail.status == "success") {
        // 缩放图片
        const picture = document.getElementById('tikz-container').firstChild;
        let scale_factor = document.getElementById('scale-factor').value;
        scale_factor = scale_factor == "" ? 1 : parseFloat(scale_factor);
        const scaled_width = picture.scrollWidth * scale_factor;
        const scaled_height = picture.scrollHeight * scale_factor;

        const wrapper = document.createElement('div');
        wrapper.style.width = scaled_width + "px";
        wrapper.style.height = scaled_height + "px";
        picture.style.transform = `scale(${scale_factor})`;
        picture.style.transformOrigin = "top left";
        wrapper.replaceChildren(picture);

        document.getElementById('tikz-container').replaceChildren(wrapper);

        // 调整挂件窗口大小
        const display_panel_frame_style = `width: ${Math.max(scaled_width + 20, 50)}px;` +
            `height: ${Math.max(scaled_height + 20, 50)}px;` +
            `border: 0;`;
        edit_panel_frame_style = changeFrameStyle(display_panel_frame_style);

        saveImageAndFrameStyle(
            unicodeToBase64(document.getElementById('tikz-container').innerHTML),
            display_panel_frame_style
        );
    }
    unlock();
})