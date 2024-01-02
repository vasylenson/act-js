import { render, element, useState, Debug } from './core.js'

export { render, element, useState, Debug }


/**
 * Create a basic app structure in an empty HTML document
 * using the provided component as the app root.
 *
 * @param {Function} component Act.js functional component
 */
export function scaffold(component) {
    const containerDiv = document.createElement('div')
    containerDiv.className = 'app'
    document.body.appendChild(containerDiv)

    render(element(component, {}), containerDiv)
}