// Rearrangement Web Worker
// This worker performs the intensive calculations for mind map rearrangement

// Import the shared rearrangement core
importScripts('/rearrangement-core.js');

// Worker message handler
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'rearrange') {
    const { rootEntry, entries, connections } = data;
    
    try {
      const result = RearrangementCore.rearrangeMindMap(
        rootEntry,
        entries,
        connections,
        (progress) => {
          self.postMessage({ type: 'progress', progress });
        }
      );
      
      // Convert Map to object for serialization
      const allPositionsObj = {};
      result.newPositions.forEach((pos, id) => {
        allPositionsObj[id] = pos;
      });
      
      self.postMessage({ 
        type: 'complete', 
        result: {
          newPositions: allPositionsObj,
          updatedEntries: result.updatedEntries
        }
      });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
};