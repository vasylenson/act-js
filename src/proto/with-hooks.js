export const element = (type, attrs, ...nodes) => {
    return {
        type,
        attrs,
        nodes: nodes.map(node => typeof node === 'string'
            ? element('TEXT', { text: node })
            : node)
    }
}

// --- Fiber reconciliation ---

let task = null

const loop = deadline => {
    let timeIsUp = false
    let done = 0
    // Timer.start('tasks') 
    while (task && !timeIsUp) {
        Timer.start('reconciliation')
        task = doTask(task)
        Timer.pause('reconciliation')
        done++
        timeIsUp = deadline.timeRemaining() < -1000
    }

    requestIdleCallback(loop)

    // if (done > 0) {
    //     Timer.stop('tasks')
    //     // console.log('did', done);
    // }
}

requestIdleCallback(loop)

const doTask = fiber => {

    let next = null

    if (!fiber.started) {
        // entering a branch
        fiber.started = true
        startTask(fiber)
        next = fiber.child || completeTask(fiber)
    } else {
        // returning after completing children
        next = completeTask(fiber)
    }

    // commit
    if (next === null) commitRoot(fiber)

    return next
}

const startTask = fiber => {
    // console.log('<', debugName(fiber), '>')

    fiber.effectList = []

    addChildren(fiber)

    let newChild = fiber.child
    let oldChild = fiber.old?.child

    // compare children while possible
    while (oldChild && newChild) {
        const effect = effectTag(oldChild, newChild)

        if (effect === 'update') {
            Object.assign(newChild, {
                effectTag: effect,
                dom: oldChild.dom,
                old: oldChild,
                hooks: oldChild.hooks
            })
            Object.assign(oldChild, newChild)
            fiber.effectList.push(newChild)
        }

        if (effect === 'replace') {
            oldChild.effectTag = 'remove'
            fiber.effectList.push(oldChild)
            newChild.effectTag = 'place'
            fiber.effectList.push(newChild)
        }

        if (effect === 'unchanged') {
            Object.assign(newChild, {
                effectTag: effect,
                dom: oldChild.dom,
                old: oldChild,
                hooks: oldChild.hooks
            })
        }

        // get successors
        newChild = newChild.sibling
        oldChild = oldChild.sibling
    }


    // just place the rest of the children
    while (oldChild) {
        oldChild.effectTag = 'remove'
        fiber.effectList.push(oldChild)
        oldChild = oldChild.sibling  // get successor
    }

    // just place the rest of the children
    while (newChild) {
        newChild.effectTag = 'place'
        fiber.effectList.push(newChild)
        newChild = newChild.sibling  // get successor
    }
}

const effectTag = (prev, next) => {
    // console.log('comparing', prev, 'to', next);

    if (prev.element.type !== next.element.type) return 'replace'

    // // console.log('attrs', prev.element.attrs, next.element.attrs)
    if (deepEqual(prev.element.attrs, next.element.attrs)) return 'unchanged'

    return 'update'
}

const addChildren = fiber => {
    if (isComponent(fiber)) {
        // console.log('old component', fiber.old)
        fiber.hooks = fiber.old?.hooks || []
        hookIndex = 0
        hooks = fiber.hooks
        fiber.child = {
            element: fiber.element.type(fiber.element.attrs),
            parent: fiber,
            nodes: [element.nodes]
        }
    } else {
        let prevChild
        for (const node of fiber.element.nodes) {
            let child = { element: node, parent: fiber }

            if (prevChild) prevChild.sibling = child
            else fiber.child = child

            prevChild = child
        }
    }
}

const isComponent = fiber => typeof fiber.element.type === 'function'

const completeTask = fiber => {
    // console.log('</', debugName(fiber), '>')

    // - merge change list into parent
    if (fiber.parent) {
        fiber.parent.effectList = [
            ...fiber.parent.effectList,
            ...fiber.effectList
        ]
    }

    // we can assume fiber has no children that have not been processed
    return fiber.sibling || fiber.parent || null
}

const commitRoot = fiber => {
    Timer.stop('render')
    Timer.start('commit')
    // console.log('committing', fiber.effectList);

    for (const change of fiber.effectList) {
        if (change.effectTag === 'place' && !isComponent(change.parent)) {
            change.dom = createDOM(change)
            // console.log(change)
            const container = change.parent.dom || change.parent.parent.dom
            // console.log('put', change.dom, 'into', container)
            container.appendChild(change.dom)
        }

        if (change.effectTag === 'update') {
            // console.log('update', debugName(change))
            syncToDOM(change.element, change.dom)
        }
    }
    Timer.stop('commit')
}

const createDOM = (fiber) => {

    if (isComponent(fiber)) return createDOM(fiber.child)

    const { type, attrs } = fiber.element

    if (type === 'TEXT') return document.createTextNode(attrs.text)

    const dom = document.createElement(type)
    syncToDOM(fiber.element, dom)

    return dom
}

const syncToDOM = ({ type, attrs }, dom) => {

    if (type === 'TEXT') {
        dom.textContent = attrs.text
        return
    }

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
}

let tree = {
    element: {
        type: 'ROOT',
        nodes: []
    }
}

const clone = fiber => ({
    element: fiber.element,
    hooks: fiber.hooks,
    old: fiber
})

export const render = (element, container) => {
    tree = clone(tree)
    tree.dom = container
    tree.element.nodes = [element]

    // console.log('render', tree)

    Timer.start('render')
    task = tree
}

const rerender = () => {
    const newTree = {
        old: tree,
        element: tree.element
    }
    // console.log('rerender', newTree);
    task = newTree
}

// --- Hooks ---

let hookIndex = 0
let hooks

function useHook(construct) {
    /**
     * requires that you follow the rules of hooks:
     * https://reactjs.org/docs/hooks-rules.html
     */
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

const arraysEqual = (as, bs) => as.length === bs.length && as.reduce(
    (equalSoFar, a, index) => equalSoFar && a === bs[index],
    true
)

const deepEqual = (a, b) => {
    if (typeof a !== typeof b) return false
    if (typeof a !== 'object') return a === b

    const as = Object.keys(a)
    const bs = Object.keys(b)

    if (!arraysEqual(as, bs)) return false

    return as.reduce(
        (equalSoFar, key) => equalSoFar && deepEqual(a[key], b[key]),
        true
    )
}


const Timer = (() => {
    let timestamps = {}
    const start = stamp => timestamps[stamp] = {
        mark: getMills(),
        time: timestamps[stamp]?.time || 0
    }

    const pause = stamp => timestamps[stamp]
        && (timestamps[stamp].time += getMills() - timestamps[stamp].mark)

    const stop = stamp => {
        if (!timestamps[stamp]) return
        pause(stamp)
        console.log(`${stamp} took ${timestamps[stamp].time} ms`)
        delete timestamps[stamp]
    }

    const getMills = () => {
        const time = new Date()
        return time.getSeconds() * 1000 + time.getMilliseconds();
    }

    return {
        start, pause, stop
    }
})()

const debugName = fiber => {
    const name = fiber.element?.type
        || fiber.dom?.tagName
        || fiber.old.dom.tagName
    return name === 'TEXT' ? fiber.element.attrs.text : name
}

const newFiber = () => {
    const fiber = {
        child: null,
    }
    return fiber
}

console.log('Debug fiber')