/**
 * @overview Core functionality of Act-js framework
 * @author Marko Vasylenko
 */

/**
 * Act.js functional component definition.
 *
 * @typedef {Function} FuncComponent
 */

/**
 * Type of a node in the virtual DOM.
 *
 * @typedef {('TEXT' | keyof HTMLElementTagNameMap | FuncComponent)} NodeType
 */

/** 
 * A Node in the Act.js virtual DOM.
 *
 * @typedef {object} Node
 * @property {NodeType} type HTML tag or functional component definition
 * @property {object} attrs attributes
 * @property {Node[]} nodes children nodes
*/

/**
 * Create a virtual DOM node.
 *
 * @param {NodeType} type HTML tag or component function
 * @param {Object} attrs attributes of the HTML element, or component props
 * @param  {...(Node | string)} nodes children elements, some of which can be text nodes
 * @returns {Node} a wrapped element, does no recursive rendering
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

/**
 * Recursively render a VDOM node to DOM.
 *
 * @param {Node} node 
 * @param {HTMLElement} container
 */
export function renderToDOM({ type, attrs, nodes: children }, container) {
    if (typeof type === 'function') {
        renderToDOM(children[0], container)
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
            /** @type {string[]} */
            const classList = attrs[name]
            classList.forEach((/** @type {string} */ className) => dom.classList.add(className))
            continue
        }

        dom[name] = attrs[name]
    }

    if (children) for (const node of children) renderToDOM(node, dom)

    container.appendChild(dom)
}

/**
 * The virtual DOM root/tree.
 * 
 * @type {?Node}
 */
let rootElement = null

/** @type {?Fiber} */
let tree = null

/**
 * The document element to which the Virtual DOM will be rendered.
 * 
 * @type {HTMLElement}
 */
let docRoot

const rerender = () => {
    Debug.log('called rerender')
    if (!rootElement) return console.warn('Called re-render on an empty tree');

    hookIndex = 0  // hooks need to be invoked in order, from the first one
    docRoot.innerHTML = ''  // clear out the previous content
    tree = buildFiberTree(rootElement)
    renderToDOM(rootElement, docRoot)
    hooks = hooks.slice(0, hookIndex)  // delete all the unused hooks
}

/**
 * Render a virtual DOM from the room component into a DOM container.
 * 
 * @param {Node} element the root virtual DOM element
 * @param {HTMLElement} container DOM element to which the virtual DOM will be rendered
 */
export function render(element, container) {
    Debug.log('called render')
    rootElement = element
    docRoot = container
    rerender()
}

// -- Fiber reconciliation --

/**
 * A fiber, as in React Fiber
 * 
 * @typedef {object} Fiber
 * @property {Node} node
 * @property {any[]} hooks
 * @property {Fiber?} parent
 * @property {Fiber?} sibling
 * @property {Fiber?} child
 * @property {HTMLElement?} dom
 */

/**
 * Construct a new fiber
 * 
 * @param {Node} node 
 * @returns {Fiber}
 */
function fiber(node) {
    return {
        node,
        hooks: [],
        parent: null,
        sibling: null,
        child: null,
        dom: null,
    }
}

/**
 * Recursively render a VDOM node to DOM.
 *
 * @param {Node} root 
 * @return {Fiber} the resulting tree
 */
function buildFiberTree(root) {
    const rootFiber = fiber(root)

    // the node is a functional component
    if (typeof root.type === 'function') {
        rootFiber.child = fiber(root.type(root.attrs))
        rootFiber.child.parent = rootFiber
        return rootFiber
    }

    if (root.nodes.length === 0) return rootFiber

    const childFibers = root.nodes.map(buildFiberTree)
    rootFiber.child = childFibers[0]

    for (let i = 0; i < childFibers.length - 1; i++) {
        childFibers[i].sibling = childFibers[i + 1]
        childFibers[i].parent = rootFiber
    }

    childFibers[childFibers.length - 1].parent = rootFiber

    return rootFiber
}



// --- Hooks ---

/**
 * A function that constructs a Hook.
 * 
 * @template THook
 * @callback HookConstructor
 * @returns {THook}
 */

/** @type {any[]} */
let hooks = []  // array of object representing various hooks
let hookIndex = 0

/**
 * @template THook
 * @param {HookConstructor<THook>} construct
 * @returns {THook} the constructed hook record.
 */
function useHook(construct) {
    if (hooks.length <= hookIndex) hooks.push(construct())
    return hooks[hookIndex++]
}

/**
 * @template T
 * @typedef {object} StateHook<T>
 * @prop {T} state
 */

/**
 * @template T
 * @callback Mapper<T>
 * @param {T} value
 * @returns {T} mapped value
 */

/**
 * @template T
 * @callback StateCallback
 * @param {Mapper<T>} mapper
 */

/**
 * 
 * @template T
 * @param {T} init initial state value
 * @returns {[T, StateCallback<T>]}
 */
export function useState(init) {

    const hook = useHook(/** @type {HookConstructor<{state: T}>} */() => ({ state: init }))

    const setState = (/** @type {Mapper<T>} */ mapper) => {
        hook.state = mapper(hook.state);
        rerender()
    }

    return [hook.state, setState]
}

/**
 * @typedef {object} EffectHook
 * @prop {any[]} dependencies
 */
/**
 * 
 * @param {Function} effect the effect callback
 * @param  {...any} dependencies shallow dependency array
 */
export function useEffect(effect, ...dependencies) {
    const hook = useHook(() => {
        effect()
        return { dependencies }
    })

    if (!arraysEqual(hook.dependencies, dependencies)) effect()
    hook.dependencies = [...dependencies]
}

function defaultLogger(data) {
    console.log({ debug: data })
}

const INFO = Symbol('INFO')
const WARN = Symbol('WARN')
const ERR = Symbol('ERR')
const logIndex = { [INFO]: 0, [WARN]: 1, [ERR]: 2 }

export const Debug = {
    // "sub-classes"
    LogLevel: { INFO, WARN, ERR },

    // properties
    logLevel: WARN,
    logger: defaultLogger,

    get tree() {
        return rootElement
    },

    // methods, some overridable
    log(data, messageLogLevel = INFO) {
        if (logIndex[messageLogLevel] >= logIndex[this.logLevel]) this.logger(data)
    },
    setDefaultLogger() {
        this.log = defaultLogger
    }
}
