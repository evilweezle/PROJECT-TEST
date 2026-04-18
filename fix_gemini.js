const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'GeminiLiveVoice.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements to use Refs inside the closure
content = content.replace(/quotes\.find/g, 'quotesRef.current.find');
content = content.replace(/parts\.find/g, 'partsRef.current.find');
content = content.replace(/workOrders\.find/g, 'workOrdersRef.current.find');
content = content.replace(/setDetailedQuote\(/g, 'setDetailedQuoteRef.current(');
content = content.replace(/setDetailedWorkOrder\(/g, 'setDetailedWorkOrderRef.current(');
content = content.replace(/setEditingPart\(/g, 'setEditingPartRef.current(');
content = content.replace(/setCurrentView\(/g, 'setCurrentViewRef.current(');
content = content.replace(/updateQuote\(/g, 'updateQuoteRef.current(');
content = content.replace(/onCreateNonMaterialQuote\(/g, 'onCreateRef.current(');
content = content.replace(/quotes\.slice/g, 'quotesRef.current.slice');
content = content.replace(/parts\.slice/g, 'partsRef.current.slice');
content = content.replace(/workOrders\.slice/g, 'workOrdersRef.current.slice');
content = content.replace(/quotes\.filter/g, 'quotesRef.current.filter');
content = content.replace(/parts\.filter/g, 'partsRef.current.filter');
content = content.replace(/clients\.filter/g, 'clientsRef.current.filter');

// Also add the new tool declaration if it's not there (it was added in step 193)
// and tool logic implementation
if (!content.includes('name: "open_external_tab"')) {
    // This part should have been handled by Step 193, but let's check
}

// Logic for open_external_tab
const toolLogic = `
                 if (name === "open_external_tab") {
                    const baseUrl = window.location.origin;
                    const url = \`\${baseUrl}?view=\${args.type}&id=\${args.id}&external=true\`;
                    
                    try {
                      const win = window.open(url, '_blank');
                      if (win) {
                        result = { status: "success", message: \`\${args.name || args.type} ouvert dans un nouvel onglet.\` };
                      } else {
                         result = { status: "warning", message: "Fenêtre bloquée par le navigateur." };
                         setMessages(prev => [...prev, { role: 'model', text: \`J'ai préparé la vue, mais la fenêtre est bloquée. [Ouvrir \${args.name || args.type}](\${url})\` }]);
                      }
                    } catch (e) {
                      result = { status: "error", message: "Erreur lors de l'ouverture de l'onglet." };
                    }
                 } else if (name === "view_quote") {`;

content = content.replace(/if \(name === "view_quote"\) {/, toolLogic);

fs.writeFileSync(filePath, content);
console.log('GeminiLiveVoice.tsx updated successfully via script');
