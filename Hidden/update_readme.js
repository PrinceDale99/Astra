const fs = require('fs');
let readme = fs.readFileSync('README.md', 'utf8');
const interactions = fs.readFileSync('Hidden/interactions.md', 'utf8');
const targetLine = '<img src="public/testnet.png" alt="Testnet Deployment Screenshot" width="100%" style="border-radius:12px; margin-top: 1rem;"/>';
const insertContent = `

<details>
<summary><b>View 52 Live Testnet Interactions</b></summary>
<br>

Here are 52 unique transactions successfully executed on the Astra Testnet contract:

${interactions.replace('# Contract Interactions\n\n', '')}
</details>`;

readme = readme.replace(targetLine, targetLine + insertContent);
fs.writeFileSync('README.md', readme);
