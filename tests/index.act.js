import { scaffold, element, useState } from '../src/act.js'
import { run } from './_suite.test.js'

const testResult = run()

const Results = () => {
    const [result, setResult] = useState(run())
    const rerun = () => setResult(_ => run())

    return (
        element(
            'div', {},
            element('button', { onclick: rerun }, 'Re-run all tests'),
            ...testResult.map(
                ({ name, success }) => element('p', {}, `Test ${name} ${success ? 'passed' : 'failed'}`)
            )
        )
    )
}

scaffold(Results)