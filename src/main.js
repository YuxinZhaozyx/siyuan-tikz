import * as editor from './editor.js'
import { getBlockAttrsAPI, setBlockAttrsAPI } from './api.js';

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

function showPanel(panel) {
    for (const panel_name of ['edit-panel', 'display-panel']) {
        document.getElementById(panel_name).style.display = (panel_name == panel ? 'flex' : 'none');
    }
    if (panel == 'edit-panel') {
        changeFrameStyle(edit_panel_frame_style);
    }
}

async function display(show_error_message = true) {
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
    await load();
    await display(false);
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
        document.getElementById("error-message").innerText = "输入的TikZ代码错误";
        document.getElementById("error-modal").style.display = "block";
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
        picture.style.scale = scale_factor;
        picture.style.transformOrigin = "top left";
        wrapper.replaceChildren(picture);

        document.getElementById('tikz-container').replaceChildren(wrapper);

        // 调整挂件窗口大小
        edit_panel_frame_style = changeFrameStyle(
            `width: ${Math.max(scaled_width + 20, 50)}px;` +
            `height: ${Math.max(scaled_height + 20, 50)}px;`
        );
    }
})