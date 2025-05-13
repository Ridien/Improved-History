import fs from 'fs'
import gemini from './gemini.js'

const logger = true
const inference_space = {}


function readFile(filePath) {
    try {
        const result = fs.readFileSync(filePath, 'utf-8')
        return result
    } catch (error) {
        console.log(error)
    }
}


function getConfigPath() {
    const configPath = process.argv[2]
    if (!configPath) {
        console.log('Error: No config path provided')
        process.exit(1)
    }
    return configPath
}


function initialParse() {
    try {
        const config_path = getConfigPath()
        const config = readFile(config_path)
        const parsedConfig = JSON.parse(config)
        return parsedConfig
    } catch (error) {
        console.log(error)
    }
}


function fileInput(item) {
    if (!item.file_path) {
        throw new Error('No file path provided');
    }
    if (!item.output_path) {
        throw new Error('No output path provided');
    }
    const file = readFile(item.file_path)
    inference_space[item.output_path] = file
}

async function geminiPrompt(item) {
    if (!item.input_path && !item.input_array) {
        throw new Error('No input provided');
    }
    const output_path = item.output_path

    let input_string = item.input_path || ''
    if(item.input_array) {
        for(const element of item.input_array) {
            if(!inference_space[element]) {
                input_string += " " + element
            } else {
                input_string += " " + inference_space[element]
            }
        }
    }
    const result = await gemini.sendMessage([], input_string, item.generation_config)
    let processed_result;
    try {
        processed_result = JSON.parse(result);
    } catch (error) {
        processed_result = result
    }
}

async function runConfig(config) {
    try {
        for (const item of config) {
            if (item.action_type) {
                switch (item.action_type) {
                    case 'define_constant': 
                        inference_space[item.output_path] = item.value
                        break;
                    case 'file_input':
                        try {
                            fileInput(item)
                        } catch (error) {
                            console.log(error)
                        }
                        break;
                    case 'gemini_prompt':
                        try {
                            await geminiPrompt(item)
                        } catch (error) {
                            console.log(error)
                        }
                        break;
                    case 'process':
                        try {
                            inference_space[item.output_path] = await runConfig(item.process_steps)
                        } catch (error) {
                            console.log(error)
                        }
                        break;
                    case 'output':
                        try {
                            let response_string = ""
                            if(item.input_path) {
                                response_string += inference_space[item.input_path]
                            }
                            if (item.output_array) {
                                for(const element of item.output_array) {
                                    if(!inference_space[element]) {
                                        response_string += " " + element
                                    } else {
                                        response_string += " " + inference_space[element]
                                    }
                                }
                            }
                            return response_string
                        } catch (error) {
                            console.log(error)
                        }
                    default:
                        break;
                }
            }
            if (logger) {
                console.log(inference_space)
                fs.writeFileSync('./inference_space/logger.txt', JSON.stringify(inference_space))
            }
        }
    } catch (error) {
        console.log(error)
    }
}

const parsedConfig = initialParse()

if (parsedConfig.length > 0) {
    console.log(await runConfig(parsedConfig))
}