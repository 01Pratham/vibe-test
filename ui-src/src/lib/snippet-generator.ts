// Code snippet generators for various languages

export interface RequestConfig {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
    bodyType?: 'json' | 'form-data'
    formData?: Array<{ key: string; value: string; type: 'text' | 'file' }>
}

export type SnippetLanguage = 'curl' | 'javascript-fetch' | 'javascript-axios' | 'python-requests' | 'python-http' | 'php-curl' | 'go' | 'java' | 'csharp' | 'ruby'

export const snippetLanguages: { id: SnippetLanguage; name: string; label: string }[] = [
    { id: 'curl', name: 'cURL', label: 'cURL' },
    { id: 'javascript-fetch', name: 'JavaScript', label: 'Fetch' },
    { id: 'javascript-axios', name: 'JavaScript', label: 'Axios' },
    { id: 'python-requests', name: 'Python', label: 'Requests' },
    { id: 'php-curl', name: 'PHP', label: 'cURL' },
    { id: 'go', name: 'Go', label: 'net/http' },
    { id: 'java', name: 'Java', label: 'HttpClient' },
    { id: 'csharp', name: 'C#', label: 'HttpClient' },
]

function escapeString(str: string, quote: "'" | '"' = "'"): string {
    return str.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`)
}

function generateCurl(config: RequestConfig): string {
    const lines: string[] = [`curl -X ${config.method} \\`]
    lines.push(`  '${config.url}' \\`)

    for (const [key, value] of Object.entries(config.headers)) {
        if (key && value) {
            lines.push(`  -H '${escapeString(key)}: ${escapeString(value)}' \\`)
        }
    }

    if (config.bodyType === 'form-data' && config.formData) {
        for (const field of config.formData) {
            if (!field.key) { continue }
            if (field.type === 'file') {
                lines.push(`  -F '${escapeString(field.key)}=@/path/to/file' \\`)
            } else {
                lines.push(`  -F '${escapeString(field.key)}=${escapeString(field.value)}' \\`)
            }
        }
    } else if (config.body) {
        lines.push(`  -d '${escapeString(config.body)}'`)
    }

    // Remove trailing backslash from last line
    const lastLine = lines[lines.length - 1]
    if (lastLine.endsWith(' \\')) {
        lines[lines.length - 1] = lastLine.slice(0, -2)
    }

    return lines.join('\n')
}

function generateJavaScriptFetch(config: RequestConfig): string {
    const options: string[] = []
    options.push(`  method: '${config.method}'`)

    const headerEntries = Object.entries(config.headers).filter(([k, v]) => k && v)
    if (headerEntries.length > 0 || config.body) {
        options.push(`  headers: {`)
        for (const [key, value] of headerEntries) {
            options.push(`    '${escapeString(key)}': '${escapeString(value)}',`)
        }
        if (config.body && config.bodyType !== 'form-data') {
            options.push(`    'Content-Type': 'application/json',`)
        }
        options.push(`  },`)
    }

    if (config.bodyType === 'form-data' && config.formData) {
        return `const formData = new FormData();
${config.formData.filter(f => f.key).map(f =>
            f.type === 'file'
                ? `formData.append('${escapeString(f.key)}', fileInput.files[0]);`
                : `formData.append('${escapeString(f.key)}', '${escapeString(f.value)}');`
        ).join('\n')}

fetch('${config.url}', {
  method: '${config.method}',
  body: formData,
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
    }

    if (config.body) {
        options.push(`  body: JSON.stringify(${config.body}),`)
    }

    return `fetch('${config.url}', {
${options.join('\n')}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
}

function generateJavaScriptAxios(config: RequestConfig): string {
    if (config.bodyType === 'form-data' && config.formData) {
        return `const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
${config.formData.filter(f => f.key).map(f =>
            f.type === 'file'
                ? `formData.append('${escapeString(f.key)}', fs.createReadStream('/path/to/file'));`
                : `formData.append('${escapeString(f.key)}', '${escapeString(f.value)}');`
        ).join('\n')}

axios.${config.method.toLowerCase()}('${config.url}', formData, {
  headers: formData.getHeaders(),
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`
    }

    const headerEntries = Object.entries(config.headers).filter(([k, v]) => k && v)
    const headersStr = headerEntries.length > 0
        ? `\n  headers: {\n${headerEntries.map(([k, v]) => `    '${escapeString(k)}': '${escapeString(v)}',`).join('\n')}\n  },`
        : ''

    const dataStr = config.body ? `\n  data: ${config.body},` : ''

    return `const axios = require('axios');

axios({
  method: '${config.method.toLowerCase()}',
  url: '${config.url}',${headersStr}${dataStr}
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`
}

function generatePythonRequests(config: RequestConfig): string {
    const lines: string[] = ['import requests']

    if (config.bodyType === 'form-data' && config.formData) {
        lines.push('')
        lines.push('files = {')
        for (const field of config.formData.filter(f => f.key)) {
            if (field.type === 'file') {
                lines.push(`    '${escapeString(field.key, "'")}': open('/path/to/file', 'rb'),`)
            }
        }
        lines.push('}')
        lines.push('data = {')
        for (const field of config.formData.filter(f => f.key && f.type === 'text')) {
            lines.push(`    '${escapeString(field.key, "'")}': '${escapeString(field.value, "'")}',`)
        }
        lines.push('}')
        lines.push('')
        lines.push(`response = requests.${config.method.toLowerCase()}(`)
        lines.push(`    '${config.url}',`)
        lines.push(`    files=files,`)
        lines.push(`    data=data,`)
        lines.push(`)`)
    } else {
        lines.push('')

        const headerEntries = Object.entries(config.headers).filter(([k, v]) => k && v)
        if (headerEntries.length > 0) {
            lines.push('headers = {')
            for (const [key, value] of headerEntries) {
                lines.push(`    '${escapeString(key, "'")}': '${escapeString(value, "'")}',`)
            }
            lines.push('}')
            lines.push('')
        }

        if (config.body) {
            lines.push(`payload = ${config.body}`)
            lines.push('')
        }

        lines.push(`response = requests.${config.method.toLowerCase()}(`)
        lines.push(`    '${config.url}',`)
        if (headerEntries.length > 0) {
            lines.push(`    headers=headers,`)
        }
        if (config.body) {
            lines.push(`    json=payload,`)
        }
        lines.push(`)`)
    }

    lines.push('')
    lines.push('print(response.json())')

    return lines.join('\n')
}

function generatePythonHttp(config: RequestConfig): string {
    const urlObj = new URL(config.url)
    const isHttps = urlObj.protocol === 'https:'

    return `import http.client
import json

conn = http.client.HTTP${isHttps ? 'S' : ''}Connection('${urlObj.host}')

headers = {
${Object.entries(config.headers).filter(([k, v]) => k && v).map(([k, v]) => `    '${escapeString(k, "'")}': '${escapeString(v, "'")}',`).join('\n')}
    'Content-Type': 'application/json',
}

${config.body ? `payload = json.dumps(${config.body})` : "payload = ''"}

conn.request('${config.method}', '${urlObj.pathname}${urlObj.search}', payload, headers)

response = conn.getresponse()
print(response.read().decode('utf-8'))`
}

function generatePhpCurl(config: RequestConfig): string {
    const lines = [
        '<?php',
        '',
        '$curl = curl_init();',
        '',
        'curl_setopt_array($curl, [',
        `    CURLOPT_URL => '${config.url}',`,
        '    CURLOPT_RETURNTRANSFER => true,',
        `    CURLOPT_CUSTOMREQUEST => '${config.method}',`,
    ]

    const headerEntries = Object.entries(config.headers).filter(([k, v]) => k && v)
    if (headerEntries.length > 0 || config.body) {
        lines.push('    CURLOPT_HTTPHEADER => [')
        for (const [key, value] of headerEntries) {
            lines.push(`        '${escapeString(key, "'")}': '${escapeString(value, "'")}',`)
        }
        if (config.body) {
            lines.push("        'Content-Type: application/json',")
        }
        lines.push('    ],')
    }

    if (config.body) {
        lines.push(`    CURLOPT_POSTFIELDS => '${escapeString(config.body, "'")}',`)
    }

    lines.push(']);')
    lines.push('')
    lines.push('$response = curl_exec($curl);')
    lines.push('curl_close($curl);')
    lines.push('')
    lines.push('echo $response;')

    return lines.join('\n')
}

function generateGo(config: RequestConfig): string {
    return `package main

import (
    "fmt"
    "io"
    "net/http"
    "strings"
)

func main() {
    ${config.body ? `payload := strings.NewReader(\`${config.body}\`)` : 'var payload io.Reader = nil'}

    req, _ := http.NewRequest("${config.method}", "${config.url}", payload)
    
${Object.entries(config.headers).filter(([k, v]) => k && v).map(([k, v]) => `    req.Header.Add("${k}", "${v}")`).join('\n')}
    ${config.body ? 'req.Header.Add("Content-Type", "application/json")' : ''}

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()

    body, _ := io.ReadAll(res.Body)
    fmt.Println(string(body))
}`
}

function generateJava(config: RequestConfig): string {
    return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${config.url}"))
            .method("${config.method}", ${config.body ? `HttpRequest.BodyPublishers.ofString("${escapeString(config.body, '"')}")` : 'HttpRequest.BodyPublishers.noBody()'})
${Object.entries(config.headers).filter(([k, v]) => k && v).map(([k, v]) => `            .header("${k}", "${v}")`).join('\n')}
            ${config.body ? '.header("Content-Type", "application/json")' : ''}
            .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
}

function generateCSharp(config: RequestConfig): string {
    return `using System.Net.Http;
using System.Text;

var client = new HttpClient();

var request = new HttpRequestMessage(HttpMethod.${config.method.charAt(0) + config.method.slice(1).toLowerCase()}, "${config.url}");
${Object.entries(config.headers).filter(([k, v]) => k && v).map(([k, v]) => `request.Headers.Add("${k}", "${v}");`).join('\n')}
${config.body ? `request.Content = new StringContent(@"${config.body.replace(/"/g, '""')}", Encoding.UTF8, "application/json");` : ''}

var response = await client.SendAsync(request);
var content = await response.Content.ReadAsStringAsync();

Console.WriteLine(content);`
}

function generateRuby(config: RequestConfig): string {
    const urlObj = new URL(config.url)
    const isHttps = urlObj.protocol === 'https:'

    return `require 'net/http'
require 'json'

uri = URI('${config.url}')
http = Net::HTTP.new(uri.host, uri.port)
${isHttps ? 'http.use_ssl = true' : ''}

request = Net::HTTP::${config.method.charAt(0) + config.method.slice(1).toLowerCase()}.new(uri)
${Object.entries(config.headers).filter(([k, v]) => k && v).map(([k, v]) => `request['${k}'] = '${v}'`).join('\n')}
${config.body ? `request.content_type = 'application/json'\nrequest.body = '${escapeString(config.body, "'")}'` : ''}

response = http.request(request)
puts response.body`
}

export function generateSnippet(language: SnippetLanguage, config: RequestConfig): string {
    switch (language) {
        case 'curl':
            return generateCurl(config)
        case 'javascript-fetch':
            return generateJavaScriptFetch(config)
        case 'javascript-axios':
            return generateJavaScriptAxios(config)
        case 'python-requests':
            return generatePythonRequests(config)
        case 'python-http':
            return generatePythonHttp(config)
        case 'php-curl':
            return generatePhpCurl(config)
        case 'go':
            return generateGo(config)
        case 'java':
            return generateJava(config)
        case 'csharp':
            return generateCSharp(config)
        case 'ruby':
            return generateRuby(config)
        default:
            return '// Language not supported'
    }
}
