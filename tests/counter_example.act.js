import { element, render, useState, Debug } from '../src/act.js'

Debug.logLevel = Debug.LogLevel.INFO

const e = element

const Counter = () => {
    const [count, setCount] = useState(0)

    return e(
        'div', {},
        e('button', { onclick: () => setCount(c => c + 1) }, '+'),
        e('p', {}, `${count}`),
        e('button', { onclick: () => setCount(c => c - 1) }, '-'),
        e('pre', {}, JSON.stringify(Debug.tree, null, 4))
    )
}


/** @type {HTMLElement} */
const appDiv = document.querySelector('#app') ?? document.body
if (appDiv) render(element(Counter, {}), appDiv)