import { NextResponse } from 'next/server';
import { metricsStore } from '../../../core/monitoring/metrics-store.js';

export async function GET(request: globalThis.Request) {
  try {
    const { searchParams } = new globalThis.URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    
    const history = {
      system: metricsStore.getSystemHistory(hours),
      database: metricsStore.getDatabaseHistory(hours),
      logs: metricsStore.getLogsHistory(hours),
      alerts: metricsStore.getAlerts(),
      stats: metricsStore.getStats()
    };

    return NextResponse.json(history, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Erro ao obter histórico de métricas:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 