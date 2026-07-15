// a tiny promise-based confirm() that renders a real modal (via ConfirmHost, mounted once at the
// app root) instead of the browser's native window.confirm() popup
let listener = null

export const confirm = (message) => {
    return new Promise((resolve) => {
        if (listener) listener({ message, resolve })
    })
}

export const registerConfirmListener = (fn) => { listener = fn }
