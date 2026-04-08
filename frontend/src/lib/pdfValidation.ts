// PDF content validation service
// Keywords and phrases that indicate network/IT relevance
const NETWORK_KEYWORDS = [
  // Network devices
  'router', 'switch', 'firewall', 'server', 'access point', 'wifi', 'lan', 'wan',
  'ethernet', 'gateway', 'bridge', 'hub', 'modem', 'load balancer',
  
  // Network concepts
  'network', 'topology', 'architecture', 'infrastructure', 'subnet', 'vlan',
  'ip address', 'mac address', 'bandwidth', 'latency', 'packet loss',
  'dns', 'dhcp', 'nat', 'vpn', 'qos', 'traffic',
  
  // Protocols and technologies
  'tcp', 'udp', 'http', 'https', 'ssh', 'ftp', 'smtp', 'pop3',
  'ospf', 'bgp', 'rip', 'eigrp', 'spanning tree',
  
  // Security
  'security', 'authentication', 'encryption', 'firewall rules', 'acl',
  'intrusion detection', 'vpn', 'ssl', 'tls',
  
  // Monitoring and management
  'monitoring', 'snmp', 'netflow', 'logging', 'alerts',
  'performance', 'availability', 'uptime', 'redundancy',
  
  // Physical infrastructure
  'cable', 'fiber', 'copper', 'rack', 'patch panel',
  'data center', 'closet', 'distribution', 'core',
  
  // Wireless
  'wireless', 'wifi', 'access point', 'ssid', 'wpa', 'wep',
  'signal strength', 'channel', 'frequency',
  
  // Cloud and virtualization
  'cloud', 'virtualization', 'vm', 'container', 'kubernetes',
  'docker', 'vmware', 'hyper-v', 'azure', 'aws', 'gcp',
];

const IRRELEVANT_KEYWORDS = [
  // Non-network topics
  'recipe', 'cooking', 'sports', 'entertainment', 'music', 'movie',
  'game', 'shopping', 'fashion', 'travel', 'vacation', 'food',
  'politics', 'religion', 'philosophy', 'art', 'literature',
  'biology', 'chemistry', 'physics', 'mathematics', 'history',
  'psychology', 'sociology', 'economics', 'finance', 'accounting',
];

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reasons: string[];
  suggestions: string[];
}

// Validate PDF content for network relevance
export function validatePdfContent(content: string): ValidationResult {
  const lowerContent = content.toLowerCase();
  const reasons: string[] = [];
  const suggestions: string[] = [];
  
  // Count network-related keywords
  let networkKeywordCount = 0;
  let irrelevantKeywordCount = 0;
  
  for (const keyword of NETWORK_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(lowerContent)) {
      networkKeywordCount++;
    }
  }
  
  for (const keyword of IRRELEVANT_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(lowerContent)) {
      irrelevantKeywordCount++;
    }
  }
  
  // Calculate confidence score
  const totalWords = lowerContent.split(/\s+/).length;
  const networkKeywordRatio = networkKeywordCount / Math.max(totalWords, 1);
  const irrelevantPenalty = irrelevantKeywordCount * 0.2;
  
  let confidence = Math.max(0, Math.min(100, (networkKeywordRatio * 100) - irrelevantPenalty));
  
  // Determine validity based on confidence and keyword count
  const isValid = confidence >= 10 && networkKeywordCount >= 2;
  
  // Generate reasons and suggestions
  if (!isValid) {
    if (networkKeywordCount < 3) {
      reasons.push('Insufficient network-related keywords found');
      suggestions.push('Include more network terminology like router, switch, firewall, VLAN, etc.');
    }
    
    if (irrelevantKeywordCount > 2) {
      reasons.push('Contains too many irrelevant keywords');
      suggestions.push('Ensure content focuses on network infrastructure and IT topics');
    }
    
    if (confidence < 15) {
      reasons.push('Low relevance confidence score');
      suggestions.push('Add detailed network architecture or topology information');
    }
    
    if (totalWords < 50) {
      reasons.push('Content too short for meaningful analysis');
      suggestions.push('Provide more detailed network documentation');
    }
  }
  
  return {
    isValid,
    confidence: Math.round(confidence),
    reasons,
    suggestions,
  };
}

// Quick validation for immediate feedback
export function quickValidate(content: string): boolean {
  const lowerContent = content.toLowerCase();
  let keywordCount = 0;
  
  // Check for at least 3 network keywords
  for (const keyword of NETWORK_KEYWORDS.slice(0, 20)) { // Check first 20 most common keywords
    if (lowerContent.includes(keyword)) {
      keywordCount++;
    }
    if (keywordCount >= 3) return true;
  }
  
  return false;
}
