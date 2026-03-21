/**
 * hooks/useEditor.js
 * Manages all Monaco editor state: files, active file, tabs, language.
 */
import { useState, useRef, useCallback } from 'react'
import { getLanguageFromFilename, getDefaultContent, getIconForFilename } from '../utils/fileUtils'

// ── Default demo files loaded on startup ──────────────────────
const DEMO_FILES = {
  'app.py': {
    language: 'python',
    content: `#!/usr/bin/env python3
"""Flask REST API - User Management Service"""
from flask import Flask, jsonify, request
import sqlite3

app = Flask(__name__)
DB_PATH = "users.db"

def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS users
                    (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)""")
    conn.commit()

@app.route('/users', methods=['GET'])
def get_users():
    conn = get_db()
    # SQL Injection vulnerability
    cursor = conn.execute("SELECT * FROM users WHERE username = '" + request.args.get('name', '') + "'")
    return jsonify(cursor.fetchall())

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    password = data['password']  # plain text password - no hashing!
    conn = get_db()
    conn.execute(f"INSERT INTO users VALUES (NULL, '{data['username']}', '{password}', '{data['email']}')")
    conn.commit()
    return jsonify({"status": "created"})

@app.route('/fibonacci', methods=['GET'])
def fibonacci():
    n = int(request.args.get('n', 10))
    result = []
    for i in range(n):
        if i == 0: result.append(0)
        elif i == 1: result.append(1)
        else: result.append(result[i-1] + result[i-2])
    x = 10 / (n - n)  # division by zero bug!
    return jsonify(result)

@app.route('/process', methods=['POST'])
def process_data():
    items = request.json.get('items', [])
    processed = []
    for i in range(len(items)):      # O(n^2) performance issue
        for j in range(len(items)):
            if items[i] == items[j]:
                processed.append(items[i])
    return jsonify(list(set(processed)))

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0')
`,
  },
  'utils.py': {
    language: 'python',
    content: `"""Utility functions"""
import re

def validate_email(email):
    pattern = r'.+'   # way too permissive
    return re.match(pattern, email) is not None

def parse_user_input(raw):
    exec(raw)   # arbitrary code execution!

def slow_search(data, target):
    for i in range(len(data)):   # should use enumerate()
        if data[i] == target:
            return i
    return -1

def format_response(data, status, msg, extra=None, timestamp=None, version=None, debug=None):
    # too many parameters — consider a dataclass
    return {"data": data, "status": status, "message": msg}
`,
  },
  'script.js': {
    language: 'javascript',
    content: `// Frontend API client
const API_BASE = 'http://localhost:5000';

async function fetchUsers(name) {
  const response = await fetch(\`\${API_BASE}/users?name=\${name}\`);
  return response.json();  // missing error handling
}

function processItems(items) {
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var item = eval(items[i]);   // eval() is dangerous!
    result.push(item);
  }
  return result;
}

function heavyComputation(n) {
  let arr = [];
  for (let i = 0; i < n; i++) {
    arr = arr.concat([i]);  // creates a new array every iteration
  }
  return arr;
}

async function createUser(userData) {
  const resp = await fetch(\`\${API_BASE}/users\`, {
    method: 'POST',
    body: JSON.stringify(userData)  // missing Content-Type header
  });
  return resp.json();
}

var globalState = {};  // global variable pollution

function updateUI(data) {
  document.getElementById('output').innerHTML = data;  // XSS vulnerability
}
`,
  },
}

export function useEditor() {
  const [files, setFiles] = useState(DEMO_FILES)
  const [activeFile, setActiveFile] = useState('app.py')
  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  // Called by <Editor> once Monaco is mounted
  const onEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }, [])

  // Switch to a different file
  const openFile = useCallback((filename) => {
    if (editorRef.current && activeFile) {
      // Persist current content before switching
      setFiles((prev) => ({
        ...prev,
        [activeFile]: { ...prev[activeFile], content: editorRef.current.getValue() },
      }))
    }
    setActiveFile(filename)
  }, [activeFile])

  // Add a brand-new file
  const addFile = useCallback((filename) => {
    const language = getLanguageFromFilename(filename)
    setFiles((prev) => ({
      ...prev,
      [filename]: { language, content: getDefaultContent(language) },
    }))
    setActiveFile(filename)
  }, [])

  // Close / delete a file
  const closeFile = useCallback((filename) => {
    setFiles((prev) => {
      const next = { ...prev }
      delete next[filename]
      return next
    })
    setActiveFile((current) => {
      if (current !== filename) return current
      const remaining = Object.keys(files).filter((f) => f !== filename)
      return remaining[0] ?? ''
    })
  }, [files])

  // Change the language of the active file
  const changeLanguage = useCallback((language) => {
    setFiles((prev) => ({
      ...prev,
      [activeFile]: { ...prev[activeFile], language },
    }))
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language)
    }
  }, [activeFile])

  // Get current code from editor (live value, not stale state)
  const getCurrentCode = useCallback(() => {
    return editorRef.current?.getValue() ?? files[activeFile]?.content ?? ''
  }, [activeFile, files])

  const jumpToLine = useCallback((line) => {
    if (!editorRef.current) return
    editorRef.current.revealLineInCenter(line)
    editorRef.current.setPosition({ lineNumber: line, column: 1 })
    editorRef.current.focus()
  }, [])

  return {
    files,
    activeFile,
    editorRef,
    monacoRef,
    onEditorMount,
    openFile,
    addFile,
    closeFile,
    changeLanguage,
    getCurrentCode,
    jumpToLine,
  }
}
