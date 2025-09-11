async function postFetch(url, data) {
    return fetch(url, {
        body: JSON.stringify(data),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then((response) => {
        return response.json();
    });
}

function getCurrentBlockId() {
    let block_id = null;
    if (!block_id) {
        try {
            block_id = window.frameElement.parentElement.parentElement.dataset.nodeId;
        } catch (err) {}
    }
    if (!block_id) {
        try {
            block_id = window.frameElement.parentElement.id;
        } catch (err) {}
    }
    if (block_id) {
        return block_id;
    } else {
        console.warn("getCurrentBlockId失效");
        return null;
    }
}

export async function getBlockAttrsAPI() {
    return postFetch('/api/attr/getBlockAttrs', {
        id: getCurrentBlockId(),
    }).then((response) => {
        if (response.code != 0) {
            throw new Error("获取块属性错误");
        };
        return response.data
    });
}

export async function setBlockAttrsAPI(attrs) {
    postFetch('/api/attr/setBlockAttrs', {
        id: getCurrentBlockId(),
        attrs: attrs,
    }).then((response) => {
        if (response.code != 0) {
            throw new Error("设置块属性错误");
        };
    })
}

export function getPageElement() {
    let element = window.frameElement;
    // while (element.classList.contains("protype")) {
    while (element.nodeName != "BODY") {
        element = element.parentElement;
    }
    return element;
}
