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
    try {
        return window.frameElement.parentElement.parentElement.getAttribute("data-node-id");
    } catch (err) {
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