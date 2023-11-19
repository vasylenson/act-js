import { render, element, useState } from './core.js'

export { render, element, useState }


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