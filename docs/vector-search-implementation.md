# Vector Search for Semantic Memory Retrieval

## Implementation Summary

Added vector embeddings to UserMemory for semantic search capabilities.

### Changes Made

1. **Schema Update** (`prisma/schema.prisma`)
   - Added `embedding String?` field to UserMemory model
   - Stores vector embeddings as JSON strings

2. **Cosine Similarity** (`src/lib/ai/cosine-similarity.ts`)
   - Pure function for computing cosine similarity between vectors
   - Handles edge cases (zero vectors, different lengths)

3. **Memory Search** (`src/lib/ai/memory-search.ts`)
   - `generateEmbedding()` - Calls OpenAI text-embedding-3-small API
   - `searchUserMemories()` - Semantic search with similarity threshold
   - `embedAndSaveMemory()` - Convenience function for embedding + storage
   - Serialization/deserialization utilities

4. **Tools Integration** (`src/lib/ai/tools.ts`)
   - Updated `saveUserMemory` tool to generate embeddings
   - Graceful fallback if embedding generation fails

5. **Tests** (`src/lib/ai/__tests__/memory-search.test.ts`)
   - Unit tests for cosine similarity
   - Tests for serialization/deserialization
   - Edge case coverage

### Verification

- All 145 tests pass
- Lint clean (0 errors)
- Database schema updated successfully

### Usage

Memories are automatically embedded when saved via the `saveUserMemory` tool. Semantic search can be performed using `searchUserMemories()` from memory-search.ts.