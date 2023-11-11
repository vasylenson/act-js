/**
 * @overview Core functionality of Act-js framework
 * @author Marko Vasylenko
 */

/**
 * @param {string | Function} type HTML tag or component function
 * @param {Object} attrs attributes of the HTML element, or component props
 * @param  {...element} nodes 
 * @returns a wrapped element, does no recursive rendering
 */
export function element(type, attrs, ...nodes) {
    return {
        type,
        attrs,
        nodes: nodes.map(node => typeof node === 'string'
            ? element('TEXT', { text: node })
            : node)
    }
}

export function renderToDOM({ type, attrs, nodes: children }, container) {
    if (typeof type === 'function') {
        renderToDOM(type(attrs), container)
        return
    }

    if (type === 'TEXT') {
        const text = document.createTextNode(attrs.text)
        container.appendChild(text)
        return
    }

    const dom = document.createElement(type)
    for (const name in attrs) {
        if (name === 'style') {
            const style = attrs[name];
            for (const property in style) dom.style.setProperty(property, style[property])
            continue
        }

        if (name === 'classList') {
            attrs[name].map(className => dom.classList.add(className))
            continue
        }

        dom[name] = attrs[name]
    }

    if (children) for (const node of children) renderToDOM(node, dom)

    container.appendChild(dom)
}

let tree
let docRoot  // document element to which the Virtual DOM will be rendered

const rerender = () => {
    hookIndex = 0  // hooks need to be invoked in order, from the first one
    docRoot.innerHTML = ''  // clear out the previous content
    renderToDOM(tree, docRoot)
    hooks = hooks.slice(0, hookIndex)  // delete all the unused hooks
}

export function render(element, container) {
    tree = element
    docRoot = container
    rerender()
}

// --- Hooks ---

let hooks = []  // array of object representing various hooks
let hookIndex = 0

function useHook(construct) {
    if (hooks.length <= hookIndex) hooks.push(construct())
    return hooks[hookIndex++]
}

export function useState(init) {

    const hook = useHook(() => ({ state: init }))

    const setState = mapper => {
        hook.state = mapper(hook.state);
        rerender()
    }

    return [hook.state, setState]
}

export function useEffect(effect, ...dependencies) {
    const hook = useHook(() => {
        effect()
        return { dependencies }
    })

    if (!arraysEqual(hook.dependencies, dependencies)) effect()
    hook.dependencies = [...dependencies]
}


// --- Helper Functions ---

const arraysEqual = (as, bs) =>
    as.reduce(
        (equalSoFar, a, index) => equalSoFar && a === bs[index],
        true
    )
