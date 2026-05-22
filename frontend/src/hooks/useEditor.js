import { useState, useRef, useCallback, useEffect } from 'react'
import { getLanguageFromFilename, getDefaultContent } from '../utils/fileUtils'
import { loadFilesFromStorage, useDebouncedSave } from './useStorage'

const DEMO_FILES = {
  'app.py': { language: 'python', content: `#!/usr/bin/env python3
"""Flask REST API - User Management Service"""
from flask import Flask, jsonify, request
import sqlite3
app = Flask(__name__)
DB_PATH = "users.db"

def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)""")
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
    password = data['password']  # plain text - no hashing!
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0')
` },
  'utils.py': { language: 'python', content: `"""Utility functions"""
import re

def validate_email(email):
    pattern = r'.+'
    return re.match(pattern, email) is not None

def parse_user_input(raw):
    exec(raw)  # dangerous!

def slow_search(data, target):
    for i in range(len(data)):
        if data[i] == target:
            return i
    return -1
` },
  'script.js': { language: 'javascript', content: `const API_BASE = 'http://localhost:5000';

async function fetchUsers(name) {
  const response = await fetch(\`\${API_BASE}/users?name=\${name}\`);
  return response.json();
}

function updateUI(data) {
  document.getElementById('output').innerHTML = data; // XSS!
}
` },
}

export function useEditor() {
  const [files, setFiles] = useState(() => {
    const saved = loadFilesFromStorage()
    return saved ? saved.files : DEMO_FILES
  })
  const [activeFile, setActiveFile] = useState(() => {
    const saved = loadFilesFromStorage()
    return saved ? saved.activeFile : 'app.py'
  })
  const editorRef    = useRef(null)
  const monacoRef    = useRef(null)
  const scheduleSave = useDebouncedSave()

  useEffect(() => { scheduleSave(files, activeFile) }, [files, activeFile, scheduleSave])

  const onEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor; monacoRef.current = monaco
  }, [])

  const openFile = useCallback((filename) => {
    if (editorRef.current && activeFile) {
      const content = editorRef.current.getValue()
      setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], content } }))
    }
    setActiveFile(filename)
  }, [activeFile])

  const addFile = useCallback((filename) => {
    const language = getLanguageFromFilename(filename)
    setFiles(prev => ({ ...prev, [filename]: { language, content: getDefaultContent(language) } }))
    setActiveFile(filename)
  }, [])

  const addFileWithContent = useCallback((filename, content) => {
    const language = getLanguageFromFilename(filename)
    setFiles(prev => ({ ...prev, [filename]: { language, content } }))
    setActiveFile(filename)
  }, [])

  const closeFile = useCallback((filename) => {
    setFiles(prev => { const next = { ...prev }; delete next[filename]; return next })
    setActiveFile(current => {
      if (current !== filename) return current
      const remaining = Object.keys(files).filter(f => f !== filename)
      return remaining[0] ?? ''
    })
  }, [files])

  const changeLanguage = useCallback((language) => {
    setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], language } }))
    if (editorRef.current && monacoRef.current)
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language)
  }, [activeFile])

  const getCurrentCode = useCallback(() =>
    editorRef.current?.getValue() ?? files[activeFile]?.content ?? '', [activeFile, files])

  const jumpToLine = useCallback((line) => {
    if (!editorRef.current) return
    editorRef.current.revealLineInCenter(line)
    editorRef.current.setPosition({ lineNumber: line, column: 1 })
    editorRef.current.focus()
  }, [])

  return { files, activeFile, editorRef, monacoRef, onEditorMount, openFile, addFile, addFileWithContent, closeFile, changeLanguage, getCurrentCode, jumpToLine }
}
