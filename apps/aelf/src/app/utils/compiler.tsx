import { ABIDescription } from '@remixproject/plugin-api'
import axios from 'axios'
import { remixClient } from './remix-client'
import _ from 'lodash'
import { Zippable, strToU8, zipSync } from "fflate"

export interface Contract {
  name: string
  content: Record<string, string>
}

export interface VyperCompilationResult {
  status: 'success'
  bytecode: string
  contractName?: string
  bytecode_runtime: string
  abi: ABIDescription[]
  ir: string
  method_identifiers: {
    [method: string]: string
  }
}

export interface VyperCompilationError {
  status: 'failed'
  column?: number
  line?: number
  message: string
}

export type VyperCompilationOutput = VyperCompilationResult | VyperCompilationError

/** Check if the output is an error */
export const isCompilationError = (output: VyperCompilationOutput): output is VyperCompilationError => output.status === 'failed'

export function normalizeContractPath(contractPath: string): string[] {
  const paths = contractPath.split('/')
  const filename = paths[paths.length - 1].split('.')[0]
  let folders = ''
  for (let i = 0; i < paths.length - 1; i++) {
    if (i !== paths.length -1) {
      folders += `${paths[i]}/`
    }
  }
  const resultingPath = `${folders}${filename}`
  return [folders,resultingPath, filename]
}

function parseErrorString(errorString) {
  // Split the string into lines
  let lines = errorString.trim().split('\n')
  // Extract the line number and message
  let message = errorString.trim()
  let targetLine = lines[2].split(',')
  let tline = lines[2].trim().split(' ')[1].split(':')

  const errorObject = {
    status: 'failed',
    message: message,
    column: tline[1],
    line: tline[0]
  }
  message = null
  targetLine = null
  lines = null
  tline = null
  return errorObject
}

const buildError = (output) => {
  if (isCompilationError(output)) {
    const line = output.line
    if (line) {
      const lineColumnPos = {
        start: { line: line - 1, column: 10 },
        end: { line: line - 1, column: 10 }
      }
      // remixClient.highlight(lineColumnPos as any, _contract.name, '#e0b4b4')
    } else {
      const regex = output?.message?.match(/line ((\d+):(\d+))+/g)
      const errors = output?.message?.split(/line ((\d+):(\d+))+/g) // extract error message
      if (regex) {
        let errorIndex = 0
        regex.map((errorLocation) => {
          const location = errorLocation?.replace('line ', '').split(':')
          let message = errors[errorIndex]
          errorIndex = errorIndex + 4
          if (message && message?.split('\n\n').length > 0) {
            try {
              message = message?.split('\n\n')[message.split('\n\n').length - 1]
            } catch (e) {}
          }
          if (location?.length > 0) {
            const lineColumnPos = {
              start: { line: parseInt(location[0]) - 1, column: 10 },
              end: { line: parseInt(location[0]) - 1, column: 10 }
            }
            // remixClient.highlight(lineColumnPos as any, _contract.name, message)
          }
        })
      }
    }
    throw new Error(output.message)
  }
}

const compileReturnType = (output, contract) => {
  const t: any = toStandardOutput(contract, output)
  const temp = _.merge(t['contracts'][contract])
  const normal = normalizeContractPath(contract)[2]
  const abi = temp[normal]['abi']
  const evm = _.merge(temp[normal]['evm'])
  const dpb = evm.deployedBytecode
  const runtimeBytecode = evm.bytecode
  const methodIdentifiers = evm.methodIdentifiers
  const version = output?.compilers[0]?.version ?? '0.3.10'
  const optimized = output?.compilers[0]?.settings?.optimize ?? true
  const evmVersion = ''

  const result: {
    contractName: any,
    abi: any,
    bytecode: any,
    runtimeBytecode: any,
    ir: '',
    methodIdentifiers: any,
    version?: '',
    evmVersion?: ''
    optimized?: boolean
  } = {
    contractName: normal,
    abi,
    bytecode: dpb,
    runtimeBytecode,
    ir: '',
    methodIdentifiers,
    version,
    evmVersion,
    optimized
  }
  return result
}

function fileContentToZip(files: Record<string, string>) {
  const zipFiles: Zippable = {}

  for (const [key, value] of Object.entries(files)) {
    zipFiles[key] = strToU8(value)
  }

  const zippedData = zipSync(zipFiles)
  return zippedData
}

function prependFolderName(files: Record<string, string>, folderName: string = 'src') {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(files)) {
    result[`${folderName}/${key}`.replace(`//`, "/")] = value
  }

  return result
}

/**
 * Compile the a contract
 * @param url The url of the compiler
 * @param contract The name and content of the contract
 */
export async function compile(url: string, contract: Contract): Promise<{status: 'success', compileCode: string}> {
  if (!contract.name) {
    throw new Error('Select the csproj file.')
  }
  const extension = contract.name.split('.')[1]
  if (extension !== 'csproj') {
    throw new Error('Use extension .csproj for aelf smart contract.')
  }

  const zippedData = fileContentToZip(prependFolderName(contract.content))

  const formData = new FormData();
  const filePath = "build.zip";
  formData.append(
    "contractFiles",
    new File([zippedData], filePath, { type: "application/zip" }),
    filePath
  )

  let response = await axios.post(`${url}playground/build`, formData )

  if (response.status === 404) {
    throw new Error(`Compiler not found at "${url}".`)
  }
  if (response.status === 400) {
    throw new Error(`Compilation failed: ${response.statusText}`)
  }

  const compileCode = response.data
  
  console.log(compileCode)
  return {
    status: 'success',
    compileCode
  }
}

/**
 * Transform Vyper Output to Solidity-like Compiler output
 * @param name Name of the contract file
 * @param compilationResult Result returned by the compiler
 */
export function toStandardOutput(fileName: string, compilationResult: any): any {
  const contractName = normalizeContractPath(fileName)[2]
  const compiledAbi = compilationResult['contractTypes'][contractName].abi
  const deployedBytecode = compilationResult['contractTypes'][contractName].deploymentBytecode.bytecode.replace('0x', '')
  const bytecode = compilationResult['contractTypes'][contractName].runtimeBytecode.bytecode.replace('0x', '')
  const compiledAst = compilationResult['contractTypes'][contractName].ast
  const methodIds = compilationResult['contractTypes'][contractName].methodIdentifiers
  const methodIdentifiers = Object.entries(methodIds as Record<any,string>).map(([key, value]) => {
    return { [key]: value.replace('0x', '') }
  })
  return {
    sources: {
      [fileName]: {
        id: 1,
        ast: compiledAst
      }
    },
    contracts: {
      [fileName]: {
        // If the language used has no contract names, this field should equal to an empty string
        [contractName]: {
          // The Ethereum Contract ABI. If empty, it is represented as an empty array.
          // See https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI
          abi: compiledAbi,
          contractName: contractName,
          evm: {
            bytecode: {
              linkReferences: {},
              object: deployedBytecode,
              opcodes: ''
            },
            deployedBytecode: {
              linkReferences: {},
              object: bytecode,
              opcodes: ''
            },
            methodIdentifiers: methodIdentifiers
          }
        }
      } as any
    }
  }
}

export async function compileContract(contract: string, compilerUrl: string, setOutput?: any, setLoadingSpinnerState?: React.Dispatch<React.SetStateAction<boolean>>, spinner?: boolean) {
  remixClient.eventEmitter.emit('resetCompilerState', {})
  spinner && spinner === true ? setLoadingSpinnerState && setLoadingSpinnerState(true) : null

  try {
    // await remixClient.discardHighlight()
    let _contract: any
    try {
      _contract = await remixClient.getContract()
    } catch (e: any) {
      const errorGettingContract = {
        status: 'failed',
        message: e.message
      }

      remixClient.eventEmitter.emit('setOutput', errorGettingContract)
      return
    }
    remixClient.changeStatus({
      key: 'loading',
      type: 'info',
      title: 'Compiling'
    })
    let output: {
      status: "success"
      compileCode: string
    }
    // try {
    output = await compile(compilerUrl, _contract)
    remixClient.log("Build succeeded.")
    // if (output.status === 'failed') {
    //   remixClient.changeStatus({
    //     key: 'failed',
    //     type: 'error',
    //     title: 'Compilation failed...'
    //   })

    //   setLoadingSpinnerState && setLoadingSpinnerState(false)
    //   remixClient.eventEmitter.emit('setOutput', { status: 'failed', message: output.message, title: 'Error compiling...', line: output.line, column: output.column, key: 1 })
    //   output = null
    //   return
    // }

    // SUCCESS
    // remixClient.discardHighlight()
    remixClient.changeStatus({
      key: 'succeed',
      type: 'success',
      title: 'success'
    })

    setLoadingSpinnerState && setLoadingSpinnerState(false)
    // const data = toStandardOutput(_contract.name, output)
    // remixClient.compilationFinish(_contract.name, _contract.content, data)
    const contractName = _contract['name']
    // const compileResult = compileReturnType(output, contractName)
    const compileResult = output.compileCode
    remixClient.eventEmitter.emit('setOutput', { contractName, compileResult })
  } catch (err: any) {
    remixClient.changeStatus({
      key: 'failed',
      type: 'error',
      title: `1 error occurred ${err.message}`
    })

    setLoadingSpinnerState && setLoadingSpinnerState(false)
    remixClient.eventEmitter.emit('setOutput', { status: 'failed', message: err.message })
  }
}

export type StandardOutput = {
  sources: {
    [fileName: string]: {
      id: number,
      ast: AST
    }
  },
  contracts: {
    [fileName: string]: {
      [contractName: string]: {
        abi: ABI,
        contractName: string,
        evm: {
          bytecode: BytecodeObject,
          deployedBytecode: BytecodeObject,
          methodIdentifiers: {
            [method: string]: string
          }
        }
      }
    }
  }
}

type AST = any // Replace with the actual AST type
type ABI = ABIDescription[] // Replace with the actual ABI type
type BytecodeObject = {
  linkReferences: Record<string, any>,
  object: string,
  opcodes: string
}

/*
export function createCompilationResultMessage(name: string, result: any) {
  if(result.status == 'success') {
    return {
      bytecode: this.state.compilationResult['bytecode'],
      bytecode_runtime: this.state.compilationResult['bytecode_runtime'],
      abi: JSON.stringify(this.state.compilationResult['abi'], null , "\t"),
      ir: this.state.compilationResult['ir']
    }
  } else if(result.status == 'failed' && result.column && result.line) {
    const header = `${name}:${result.line}:${result.column}`
    const body = this.state.compilationResult.message.split(/\r\n|\r|\n/)
    const arr = [header].concat(body).join("\n")
    return {
      bytecode: arr,
      bytecode_runtime: arr,
      abi: arr,
      ir: arr
    }
  } else if(result.status == 'failed') {
    const message = this.state.compilationResult.message
    return {
      bytecode: message,
      bytecode_runtime: message,
      abi: message,
      ir: message
    }
  }
  return {
    bytecode: "",
    bytecode_runtime: "",
    abi: "",
    ir: ""
  }
}
*/
