import { useState, useEffect } from 'react';
import { Loader2, Network, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Device {
  id: string;
  type: string;
  ip?: string;
  status: string;
  label?: string;
}

interface Connection {
  from_device: string;
  to_device: string;
  status: string;
}

interface NetworkAlert {
  device: string;
  issue: string;
  severity: string;
  time: string;
}

interface NetworkAnalysis {
  summary: string;
  cause: string;
  suggestion: string;
}

interface NetworkResponse {
  topology: {
    devices: Device[];
    connections: Connection[];
  };
  alerts: NetworkAlert[];
  analysis: NetworkAnalysis;
  chat_response: string;
}

const API_BASE = 'http://localhost:8000';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL;

export function NetworkManagement() {
  const [response, setResponse] = useState<NetworkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analyzeWithAI = async (networkData: any, text?: string) => {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key') return null;
    
    try {
      const prompt = `As a professional network engineer, analyze this network data and provide insights.
      
Network Topology: ${JSON.stringify(networkData.topology, null, 2)}
${text ? `User Input: ${text}` : ''}
${networkData.alerts.length > 0 ? `Active Alerts: ${JSON.stringify(networkData.alerts, null, 2)}` : 'No active alerts'}

Provide a concise analysis in this JSON format:
{
  "summary": "Brief summary of network status",
  "cause": "Root cause analysis if issues detected",
  "suggestion": "Actionable recommendations"
}`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an expert network engineer providing concise, professional network analysis. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const content = aiResponse.choices[0].message.content;
        
        // Clean up JSON content
        let cleanedContent = content;
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        cleanedContent = cleanedContent.trim();
        
        // Additional cleaning for common JSON issues
        cleanedContent = cleanedContent
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/\n/g, '')      // Remove newlines
          .replace(/\t/g, '')      // Remove tabs
          .replace(/\s+/g, ' ');   // Normalize spaces
        
        try {
          return JSON.parse(cleanedContent);
        } catch (parseError) {
          console.warn('Failed to parse AI response as JSON:', parseError);
          console.warn('Raw content:', cleanedContent);
          return null;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Groq API error:', errorData);
        return null;
      }
    } catch (error) {
      console.warn('AI analysis failed:', error);
      return null;
    }
  };

  const analyzeNetwork = async (text?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = text ? `${API_BASE}/api/network/analyze` : `${API_BASE}/api/network/topology`;
      const options: RequestInit = text ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_input: text })
      } : { method: 'GET' };

      const res = await fetch(url, options);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      let networkResponse;
      
      if (text) {
        networkResponse = data;
      } else {
        // For topology endpoint, create a basic response structure
        networkResponse = {
          topology: data,
          alerts: [],
          analysis: {
            summary: "Network topology loaded successfully",
            cause: "No issues detected",
            suggestion: "System operating normally"
          },
          chat_response: "✅ Network topology loaded. All systems operational."
        };
      }

      // Enhance with AI analysis if API key is available
      if (GROQ_API_KEY) {
        const aiAnalysis = await analyzeWithAI(networkResponse, text);
        if (aiAnalysis) {
          networkResponse.analysis = {
            summary: aiAnalysis.summary || networkResponse.analysis.summary,
            cause: aiAnalysis.cause || networkResponse.analysis.cause,
            suggestion: aiAnalysis.suggestion || networkResponse.analysis.suggestion
          };
          networkResponse.chat_response = `🤖 Groq AI Analysis: ${aiAnalysis.summary} ${aiAnalysis.suggestion}`;
        }
      }
      
      setResponse(networkResponse);
    } catch (err) {
      console.error('Network analysis error:', err);
      if (err instanceof Error && err.message.includes('JSON')) {
        setError('AI response parsing failed. Using local analysis instead.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to analyze network');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeNetwork();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
      case 'down':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[#f0f9ff] min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <Network className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-slate-800">Network Management System</h1>
      </div>

      {/* Text Analysis Section */}
      <div className="rounded-lg border bg-white/30 backdrop-blur-md p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Network Analysis</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe your network (e.g., 'Router R1 connected to Switch S1 at 192.168.1.1')"
              value={textInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextInput(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 bg-white/50 backdrop-blur-sm px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950"
            />
            <button 
              onClick={() => analyzeNetwork(textInput)}
              disabled={loading || !textInput.trim()}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-9 px-4 py-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </button>
            <button 
              onClick={() => analyzeNetwork()}
              disabled={loading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white shadow-sm hover:bg-slate-100 h-9 px-4 py-2"
            >
              Load Sample
            </button>
          </div>

          {error && (
            <div className="relative w-full rounded-lg border p-4 border-red-200/50 text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {response && (
        <>
          {/* Network Topology */}
          <div className="rounded-lg border bg-white/30 backdrop-blur-md p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Network Topology</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Devices */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-800">Devices</h3>
                <div className="space-y-2">
                  {response.topology.devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-2 border rounded border-slate-200">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(device.status)}
                        <span className="font-medium text-slate-800">{device.id}</span>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-slate-200 text-slate-800">{device.type}</span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {device.ip && <span>{device.ip}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-800">Connections</h3>
                <div className="space-y-2">
                  {response.topology.connections.map((conn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded border-slate-200">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conn.status)}
                        <span className="text-slate-800">{conn.from_device} → {conn.to_device}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-slate-200 text-slate-800">{conn.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {response.alerts.length > 0 && (
            <div className="rounded-lg border bg-white/30 backdrop-blur-md p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">Active Alerts</h2>
              <div className="space-y-3">
                {response.alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                      <div>
                        <p className="font-medium text-slate-800">{alert.device}: {alert.issue}</p>
                        <p className="text-sm text-slate-500">{alert.time}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-slate-200 text-slate-800">{alert.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          <div className="rounded-lg border bg-white/30 backdrop-blur-md p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Network Analysis</h2>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Summary</h4>
                <p className="text-slate-700">{response.analysis.summary}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Root Cause</h4>
                <p className="text-slate-700">{response.analysis.cause}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Recommendation</h4>
                <p className="text-slate-700">{response.analysis.suggestion}</p>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800">{response.chat_response}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
