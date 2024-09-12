import { useState, useEffect, useRef } from 'react'

import { remixClient } from './utils'
import { CompilationResult } from '@remixproject/plugin-api'

// Components
import CompilerButton from './components/CompilerButton'
import Result from './components/Result'
import Button from 'react-bootstrap/Button'

import './app.css'
import { CustomTooltip } from '@remix-ui/helper'
import { CompileErrorCard } from './components/CompileErrorCard'

interface AppState {
  status: 'idle' | 'inProgress'
  environment: 'remote' | 'local'
  compilationResult?: CompilationResult
  localUrl: string
}

const App = () => {
  const [contract, setContract] = useState<string>()
  const [output, setOutput] = useState<any>(remixClient.compilerOutput)
  const [state, setState] = useState<AppState>({
    status: 'idle',
    environment: 'remote',
    localUrl: 'http://localhost:8000/',
  })

  useEffect(() => {
    async function start() {
      try {
        await remixClient.loaded()
        remixClient.onFileChange((name) => {
          !name.endsWith('.csproj') && remixClient.changeStatus({ key: 'none' })
          setOutput({})
          setContract(name)
        })
        remixClient.onNoFileSelected(() => setContract(''))
      } catch (err) {
        console.log(err)
      }
      try {
        const name = await remixClient.getContractName() // throw if no file are selected
        setContract(name)
      } catch (e) {}
    }
    start()
  }, [])

  useEffect(() => {
    remixClient.eventEmitter.on('resetCompilerState', () => {
      resetCompilerResultState()
    })

    return () => {
      remixClient.eventEmitter.off('resetCompilerState', () => {
        resetCompilerResultState()
      })
    }
  }, [])

  useEffect(() => {
    remixClient.eventEmitter.on('setOutput', (payload) => {
      setOutput(payload)
    })

    return () => {
      remixClient.eventEmitter.off('setOutput', (payload) => {
        setOutput(payload)
      })
    }
  }, [])

  /** Update the environment state value */
  function setEnvironment(environment: 'local' | 'remote') {
    setState({ ...state, environment })
  }

  function compilerUrl() {
    return state.environment === 'remote' ? 'https://playground-next.test.aelf.dev/' : state.localUrl
  }

  function resetCompilerResultState() {
    setOutput(remixClient.compilerOutput)
  }

  const [cloneCount, setCloneCount] = useState(0)

  return (
    <main id="aelf-plugin">
      <section>
        <div className="px-3 pt-3 mb-3 w-100">
          <CustomTooltip placement="bottom" tooltipText="Clone a repo of aelf smart contract examples. Switch to the File Explorer to see the examples.">
            <Button data-id="add-repository" className="w-100 btn btn-secondary" onClick={() => {
              {cloneCount === 0 ? remixClient.cloneRepo() : remixClient.cloneRepo(cloneCount)}
              setCloneCount((prev) => {
                return ++prev
              })
            }}>
              Clone a repo of aelf smart contract examples
            </Button>
          </CustomTooltip>
        </div>

        <div className="px-3 w-100 mb-3 mt-1" id="compile-btn">
          <CompilerButton compilerUrl={compilerUrl()} contract={contract} setOutput={(name, update) => setOutput({ ...output, [name]: update })} resetCompilerState={resetCompilerResultState} output={output} remixClient={remixClient}/>
        </div>

        <article id="result" className="p-2 mx-3 border-top mt-2">
          {output && Object.keys(output).length > 0 && output.status !== 'failed' ? (
            <>
              <Result output={output} plugin={remixClient} />
            </>
          ) : output.status === 'failed' ? (
            <CompileErrorCard output={output} plugin={remixClient} />
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default App
