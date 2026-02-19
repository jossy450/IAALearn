const path = require('path');
const smartAI = require(path.resolve(__dirname, '../server/services/smartAI'));

async function run() {
  const question = 'How would you handle a sustained partial cooling failure?';
  const position = 'Data Center Technician';
  const company = 'Amazon UK';
  const sessionType = 'technical';
  const cv = `Managed data center operations including HVAC oversight, UPS maintenance, rack deployments, and network cabling. Experience with VMware virtualization and Prometheus monitoring. Responsible for vendor coordination for chiller maintenance.`;
  const jobDescription = `Looking for experienced Data Center tech familiar with facility management, CRAC units, UPS systems, cooling redundancy, and datacenter networking.`;

  // Extract keywords using the actual service helper
  const keywords = smartAI.extractTechnicalKeywords(cv, jobDescription).slice(0, 10);

  // Build session guidance (same logic as in service)
  let sessionTypeGuidance = '';
  switch (sessionType.toLowerCase()) {
    case 'technical':
      sessionTypeGuidance = `- Prioritize technical depth and specific technologies/systems\n- Explain architectural decisions and technical reasoning\n- Include specific tools, languages, frameworks, or methodologies used\n- Show problem-solving approach and technical expertise\n- For behavioral questions: Focus on technical ownership and technical decision-making`;
      break;
    case 'behavioral':
      sessionTypeGuidance = `- Prioritize STAR format strictly (Situation → Task → Action → Result)\n- Focus on soft skills and leadership`;
      break;
    case 'case-study':
      sessionTypeGuidance = `- Use structured problem-solving and discuss trade-offs`;
      break;
    default:
      sessionTypeGuidance = `- Provide balanced answers covering technical, behavioral, and practical aspects`;
  }

  const technicalKeywordsText = keywords.length > 0 ? `RELEVANT TECHNOLOGIES & SYSTEMS: ${keywords.join(', ')}` : '';

  const systemPrompt = `You are an expert interview coach. Produce a PERFECT technical STAR answer.\nPosition: ${position}\nCompany: ${company}\nSession Type: ${sessionType.toUpperCase()}\n${technicalKeywordsText}\nSession Guidance:\n${sessionTypeGuidance}`;

  const userPrompt = `Interview Question: "${question}"\nCandidate CV: ${cv}\nJob Description: ${jobDescription}`;

  console.log('--- SYSTEM PROMPT ---');
  console.log(systemPrompt);
  console.log('\n--- USER PROMPT ---');
  console.log(userPrompt);

  // Produce a mocked STAR answer using extracted keywords where possible
  const techList = keywords.length ? keywords.slice(0,3) : ['CRAC units','UPS','chillers'];
  const answer = `SITUATION: At my previous role supporting a hyperscale datacenter, we experienced a sustained partial cooling failure affecting a subset of racks served by one CRAC bank and a backup chiller unit. The cooling issue threatened increased inlet temps and potential thermal throttling on several hosts.\n\nTASK: I was tasked with quickly stabilizing temperatures, protecting workloads, and coordinating a technical remediation plan while minimizing downtime.\n\nACTION: I first triaged affected racks using our Prometheus/Grafana monitoring to identify hotspots and raised CRAC setpoints to balance airflow, then activated additional UPS-backed portable cooling and redistributed non-critical workloads off the hottest racks. I isolated faulty CRAC controls and re-routed chilled water supply by coordinating with facilities and the chiller vendor. Simultaneously I updated BMC-based fan curves and temporarily reduced non-critical VM CPU loads in VMware to lower heat output.\n\nRESULT: Temperatures returned to safe ranges within 90 minutes, avoiding any server shutdowns and limiting performance impact to <5% on critical services. The remediation reduced expected emergency maintenance window by 4 hours and prevented potential SLA breaches. This demonstrates my operational ownership, facility coordination, and hands-on use of monitoring and virtualization tooling.`;

  console.log('\n--- SIMULATED AI ANSWER (STAR) ---');
  console.log(answer);
}

run().catch(e => { console.error(e); process.exit(1); });