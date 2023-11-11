# Act.js

*Baby's first JavaScript "framework".*

Act.js is a JavaScipt view library (that's right, not a framework) I developed
as a part of a web-development project I did in my freshman year of Bachelor's.
Its development is motivated in two ways: interested in inner workings of view
frameworks and requirement to develop a web-app without external dependecies.

This commit contains the lastest version of the code I have written back then,
but it does contain some critical bugs, so I have iterated on it more since.

This repo is mostly for historical and educational purposes. The codebase is
small and simple, the fucntionality is minimal and in no way ground-breaking.
But it is a good reflection of my coding skill and approach from in the past,
and I would argue an interesting example (both good and bad, in its different
aspects) for someone starting with JavaScript view libraries to look at.

## Usage

For the sake of sticking to original requirements, the project is not an NPM
package, and does not rely on anything you would need to NPM-install to work.
You only need the `act.js` file in the root of this repo. It's up to you how
you choose to include it, but it's tiny, so you might as well just copy it.

> The file is an ES6 module, and it's been a minute since I've dealt with those
> outside of a bundler, so I'm figuring out the compatibility...

## Development

Despite the limitattion of no external dependencies, there are still some tools
used to make the development in vanilla JS more brearable. There include:

- JSDoc typedefs, that VSCode can use for type reference
