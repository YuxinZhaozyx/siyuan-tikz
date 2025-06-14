import * as editor from './editor.js'
import { getBlockAttrsAPI, setBlockAttrsAPI } from './api.js';

async function load() {
    const attrs = await getBlockAttrsAPI();
    if (attrs['custom-latex-code']) {
        editor.setValue(attrs['custom-latex-code']);
    }
}

async function save() {
    const attrs = {}
    attrs['custom-latex-code'] = await editor.getValue();
    
    setBlockAttrsAPI(attrs);
}

function showPanel(panel) {
    for (const panel_name of ['edit-panel', 'display-panel']) {
        document.getElementById(panel_name).style.display = (panel_name == panel ? 'flex' : 'none');
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
})