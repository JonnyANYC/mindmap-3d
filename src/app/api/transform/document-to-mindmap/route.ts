import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// TGI endpoint (HuggingFace Text Generation Inference running locally)
const TGI_API_URL = 'http://172.17.0.1:8000/generate'

// JSON Graph Format types matching our mindmap structure
interface JGFNode {
  id: string
  metadata: {
    title: string
    description?: string
    isRoot?: boolean
  }
}

interface JGFEdge {
  source: string
  target: string
}

interface JGFGraph {
  graph: {
    directed: false
    nodes: JGFNode[]
    edges: JGFEdge[]
  }
}

// Validation function for the generated mind map
function validateMindMap(data: unknown): { valid: boolean; error?: string } {
  try {
    // Check if data has the expected JGF structure
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Response is not a valid JSON object' }
    }

    const jsonData = data as Record<string, unknown>

    if (!jsonData.graph || typeof jsonData.graph !== 'object') {
      return { valid: false, error: 'Response missing graph property' }
    }

    const graph = jsonData.graph as Record<string, unknown>
    const { nodes, edges } = graph

    // Validate nodes exist and is an array
    if (!Array.isArray(nodes)) {
      return { valid: false, error: 'Nodes must be an array' }
    }

    if (nodes.length === 0) {
      return { valid: false, error: 'At least one entry is required' }
    }

    // Validate each node has required properties
    const nodeIds = new Set<string>()
    let rootCount = 0

    for (const node of nodes as Record<string, unknown>[]) {
      if (!node.id || typeof node.id !== 'string') {
        return { valid: false, error: 'Each node must have a string id' }
      }

      if (nodeIds.has(node.id)) {
        return { valid: false, error: `Duplicate node id found: ${node.id}` }
      }
      nodeIds.add(node.id)

      const metadata = node.metadata as Record<string, unknown> | undefined

      if (!metadata || typeof metadata !== 'object') {
        return { valid: false, error: `Node ${node.id} missing metadata` }
      }

      if (!metadata.title || typeof metadata.title !== 'string') {
        return { valid: false, error: `Node ${node.id} must have a title` }
      }

      if (metadata.isRoot === true) {
        rootCount++
      }
    }

    // Validate exactly one root node
    if (rootCount === 0) {
      return { valid: false, error: 'Exactly one entry must be marked as root' }
    }

    if (rootCount > 1) {
      return { valid: false, error: `Only one entry can be root, found ${rootCount}` }
    }

    // Validate edges if they exist
    if (edges) {
      if (!Array.isArray(edges)) {
        return { valid: false, error: 'Edges must be an array' }
      }

      for (const edge of edges as Record<string, unknown>[]) {
        const source = edge.source as string | undefined
        const target = edge.target as string | undefined

        if (!source || !target) {
          return { valid: false, error: 'Each edge must have source and target' }
        }

        if (source === target) {
          return { valid: false, error: 'Edge cannot connect a node to itself' }
        }

        if (!nodeIds.has(source)) {
          return { valid: false, error: `Edge references non-existent node: ${source}` }
        }

        if (!nodeIds.has(target)) {
          return { valid: false, error: `Edge references non-existent node: ${target}` }
        }
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Convert JGF format to our internal format
function convertJGFToMindMap(jgfData: JGFGraph) {
  const entries = jgfData.graph.nodes.map(node => ({
    id: node.id,
    title: node.metadata.title,
    content: node.metadata.description || '',
    position: [0, 0, 0] as [number, number, number], // Positions will be calculated client-side
    isRoot: node.metadata.isRoot || false
  }))

  const connections = (jgfData.graph.edges || []).map(edge => ({
    id: uuidv4(),
    source: edge.source,
    target: edge.target
  }))

  return { entries, connections }
}

export async function POST(request: NextRequest) {
  try {
    const { document } = await request.json()

    if (!document || typeof document !== 'string') {
      return NextResponse.json(
        { error: 'Document text is required' },
        { status: 400 }
      )
    }

    // Prepare the prompt for the LLM
    const systemPrompt = `You are a mind map generator. Convert the provided document into a mind map structure using JSON Graph Format (JGF).

Rules:
1. Create nodes representing key concepts from the document
2. Each node MUST have an id (string) and metadata with title (required) and optional description
3. Exactly ONE node must have metadata.isRoot set to true - this should be the main topic
4. Create edges to show relationships between concepts (edges are optional)
5. Edges must connect different nodes (no self-loops)
6. The graph must be undirected (directed: false)

Generate a valid JGF structure with these exact fields:
{
  "graph": {
    "directed": false,
    "nodes": [
      {
        "id": "unique-id",
        "metadata": {
          "title": "Node Title",
          "description": "Optional description",
          "isRoot": true/false
        }
      }
    ],
    "edges": [
      {
        "source": "node-id-1",
        "target": "node-id-2"
      }
    ]
  }
}`

    const userPrompt = `Convert the following document into a mind map:\n\n${document}`

    // Call TGI endpoint with JSON output format
    const response = await fetch(TGI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\n${userPrompt}`,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
          grammar: {
            type: 'json',
            value: {
              "type": "object",
              "properties": {
                "graph": {
                  "type": "object",
                  "properties": {
                    "directed": {
                      "type": "boolean",
                      "const": false
                    },
                    "nodes": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "metadata": {
                            "type": "object",
                            "properties": {
                              "title": { "type": "string" },
                              "description": { "type": "string" },
                              "isRoot": { "type": "boolean" }
                            },
                            "required": ["title"]
                          }
                        },
                        "required": ["id", "metadata"]
                      },
                      "minItems": 1
                    },
                    "edges": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "source": { "type": "string" },
                          "target": { "type": "string" }
                        },
                        "required": ["source", "target"]
                      }
                    }
                  },
                  "required": ["directed", "nodes"]
                }
              },
              "required": ["graph"]
            }
          }
        }
      })
    }).catch(error => {
      console.error('TGI API connection error:', error)
      return null
    })

    if (!response) {
      return NextResponse.json(
        { error: 'Could not connect to text generation service. Please ensure the TGI server is running.' },
        { status: 500 }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TGI API error:', errorText)

      // Check if it's a connection error
      if (response.status === 0 || !response.status) {
        return NextResponse.json(
          { error: 'Text generation service is not available. Please try again later.' },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to generate mind map from document' },
        { status: response.status }
      )
    }

    const tgiResponse = await response.json()

    // TGI returns the generated text in a specific format
    let generatedText = ''
    if (tgiResponse[0]?.generated_text) {
      generatedText = tgiResponse[0].generated_text
    } else if (typeof tgiResponse === 'string') {
      generatedText = tgiResponse
    } else {
      console.error('Unexpected TGI response format:', tgiResponse)
      return NextResponse.json(
        { error: 'Unexpected response format from text generation service' },
        { status: 500 }
      )
    }

    // Parse the generated JSON
    let jgfData: JGFGraph
    try {
      jgfData = JSON.parse(generatedText)
    } catch {
      console.error('Failed to parse LLM response as JSON:', generatedText)
      return NextResponse.json(
        { error: 'Generated response is not valid JSON' },
        { status: 500 }
      )
    }

    // Validate the generated mind map
    const validation = validateMindMap(jgfData)
    if (!validation.valid) {
      console.error('Mind map validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 500 }
      )
    }

    // Check if there are no entries (should be caught by validation, but double-check)
    if (!jgfData.graph.nodes || jgfData.graph.nodes.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract any concepts from the document' },
        { status: 422 }
      )
    }

    // Convert to our internal format and return
    const mindMapData = convertJGFToMindMap(jgfData)

    return NextResponse.json(mindMapData, { status: 200 })

  } catch (error) {
    console.error('Error in document-to-mindmap endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}