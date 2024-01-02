/**
 * 
 * @param {any[]} as 
 * @param {any[]} bs 
 * @returns {boolean}
 */
const arraysEqual = (as, bs) =>
    as.reduce(
        (equalSoFar, a, index) => equalSoFar && a === bs[index],
        true
    )