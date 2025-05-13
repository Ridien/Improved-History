# ImprovedHistory: Enhanced Prompt & Artifact Management for Google Gemini

ImprovedHistory is a Node.js command-line tool designed to streamline and enhance interactions with the Google Gemini API. It provides a flexible "inference space" for storing, managing, and reusing intermediate results, file contents, and constants across a series of configurable steps. This allows for complex, multi-stage prompting workflows where artifacts from one step can be seamlessly cherry-picked and utilized as input for subsequent steps, including prompts to the Gemini model.

## Key Features

*   **Configuration-Driven Workflows:** Define complex processing pipelines using a simple JSON configuration file.
*   **Persistent Inference Space:** All intermediate data (constants, file contents, API responses) are stored in an `inference_space` object, accessible by unique keys throughout the workflow.
*   **Modular Actions:** Supports various actions like defining constants, reading files, prompting Gemini, and processing sub-configurations.
*   **Flexible Prompt Construction:** Easily assemble prompts for Gemini by referencing values from the `inference_space` or including literal strings.
*   **Artifact Management:** Store and reuse any text-based artifact (e.g., initial data, Gemini responses, processed text) within your workflow.
*   **Recursive Processing:** Define "process" steps that execute a nested configuration, allowing for modular and reusable sub-workflows.
*   **Output Formatting:** Construct a final output string by combining various elements from the `inference_space`.
*   **Logging:** Optional logging of the `inference_space` state after each step for debugging and transparency.

## Prerequisites

*   Node.js (v18.x or later recommended)
*   npm or yarn
*   Google Cloud Project with the Gemini API enabled.
*   A Google Gemini API Key.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url-here> # Replace with your actual repo URL
    cd ImprovedHistory
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Gemini API key:
    ```env
    API_KEY=YOUR_GEMINI_API_KEY
    ```

## Configuration

ImprovedHistory is driven by a JSON configuration file. This file is an array of "action" objects, each specifying a step in your workflow.

### Core Concept: The `inference_space`

The `inference_space` is a JavaScript object that acts as a temporary, in-memory database for your workflow. Each action that produces output will store its result in the `inference_space` under a key specified by its `output_path`. Subsequent actions can then reference these stored values using `input_path` or by name within an `input_array` or `output_array`.

### Action Types

Here are the available `action_type` options:

1.  **`define_constant`**:
    Stores a static value in the `inference_space`.
    *   `output_path` (string, required): The key under which to store the value.
    *   `value` (any, required): The constant value to store.

2.  **`file_input`**:
    Reads the content of a file into the `inference_space`.
    *   `file_path` (string, required): Path to the file to be read.
    *   `output_path` (string, required): The key under which to store the file content.

3.  **`gemini_prompt`**:
    Sends a prompt to the Gemini API and stores the parsed JSON response.
    *   `input_path` (string, optional): A key from `inference_space` whose value will be used as the initial part of the prompt.
    *   `input_array` (array of strings, optional): An array of strings. Each string can be a literal value or a key from `inference_space`. These are concatenated (with spaces) to form the prompt. If `input_path` is also provided, its value comes first.
    *   `output_path` (string, required): The key under which to store the parsed JSON response from Gemini.
    *   `generation_config` (object, optional): Configuration for the Gemini API call (e.g., `temperature`, `max_output_tokens`, `response_mime_type`). Defaults to a standard configuration if not provided. If you expect a JSON response from Gemini, ensure your prompt instructs it to return JSON and set `response_mime_type: "application/json"` or ensure Gemini returns a string that is valid JSON.

4.  **`process`**:
    Executes a nested array of action steps. The result of this sub-process (typically from an `output` action within it) is stored.
    *   `process_steps` (array of action objects, required): The nested configuration to execute.
    *   `output_path` (string, required): The key under which to store the result of the `process_steps`.

5.  **`output`**:
    Constructs a string from values in the `inference_space`. This action is typically the last step in a `process` block or the main configuration to produce a final result.
    *   `input_path` (string, optional): A key from `inference_space` whose value will be the initial part of the output string.
    *   `output_array` (array of strings, optional): An array of strings. Each string can be a literal value or a key from `inference_space`. These are concatenated (with spaces) to form the final output string. If `input_path` is also provided, its value comes first.
    *   **Note:** This action returns the constructed string. If it's the last action in the main config, this string will be printed to the console.

## Usage

Run the script from the command line, providing the path to your JSON configuration file:

```bash
node index.js path/to/your/config.json
```

**Example `config.json`:**

Let's say you have a file `user_story_template.txt`:

```txt
As a {{role}}, I want to {{action}} so that {{benefit}}.
The project context is: {{project_context}}
Please elaborate on this user story.
```

And your `config.json` could be:

```json
[
  {
    "action_type": "define_constant",
    "output_path": "user_role",
    "value": "Product Manager"
  },
  {
    "action_type": "define_constant",
    "output_path": "user_action",
    "value": "define clear acceptance criteria"
  },
  {
    "action_type": "define_constant",
    "output_path": "user_benefit",
    "value": "developers can build the feature correctly"
  },
  {
    "action_type": "file_input",
    "file_path": "./user_story_template.txt",
    "output_path": "story_template_raw"
  },
  {
    "action_type": "gemini_prompt",
    "input_array": [
      "story_template_raw",
      "Given the role:", "user_role",
      "the action:", "user_action",
      "and the benefit:", "user_benefit",
      "project_context: This is a new mobile application for task management."
    ],
    "output_path": "gemini_elaborated_story_json",
    "generation_config": {
      "temperature": 0.7,
      "max_output_tokens": 500,
      "response_mime_type": "text/plain"
    }
  },
  {
    "action_type": "output",
    "output_array": [
      "Initial Role:", "user_role", "\n",
      "Gemini Elaboration:", "gemini_elaborated_story_json"
    ]
  }
]
```

**Running the example:**

```bash
node index.js ./config.json
```

This will:
1.  Define `user_role`, `user_action`, `user_benefit`.
2.  Read `user_story_template.txt` into `story_template_raw`.
3.  Construct a prompt using the template and the defined constants, then send it to Gemini.
4.  Store Gemini's text response (which we assume the prompt asked to be a JSON string, or if not, it will be treated as a plain string) into `gemini_elaborated_story_json`.
5.  Output a final string combining the initial role and Gemini's elaboration.

### Logging

If the `logger` variable in `index.js` is set to `true` (default), the state of the `inference_space` will be logged to the console after each step and also written to `./inference_space/logger.txt`. You might want to create an `inference_space` directory if it doesn't exist, or the script will create it.

## How it Works (Internals)

*   `index.js`: The main script that parses command-line arguments, reads the configuration file, and iterates through the action steps.
*   `inference_space`: A global JavaScript object in `index.js` that stores all data.
*   `runConfig(config)`: A recursive function that processes an array of action items.
    *   It uses a `switch` statement to delegate to specific handler functions based on `action_type`.
    *   `fileInput()`: Handles reading files.
    *   `geminiPrompt()`: Constructs the prompt string from `input_path` and/or `input_array` (resolving keys from `inference_space`), calls the `gemini.js` module, and parses the response (assuming it's JSON, otherwise it might error or store a string representation of JSON if Gemini returns plain text that looks like JSON).
*   `gemini.js`: A wrapper around the `@google/generative-ai` SDK to simplify sending messages to the Gemini API.

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or bug fixes, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a new Pull Request.

Please ensure your code follows the existing style and includes tests for new features if applicable.

## License

This project is open-source.