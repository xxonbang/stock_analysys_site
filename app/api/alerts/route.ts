/**
 * 알림 조회 API
 * 
 * GET /api/alerts?severity=high&limit=50
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/lib/alert-system';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get('severity') as
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
      | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let alerts;
    if (activeOnly) {
      alerts = alertSystem.getActiveAlerts(severity || undefined);
    } else {
      alerts = alertSystem.getAllAlerts(limit);
    }

    const stats = alertSystem.getAlertStats();

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.slice(0, limit),
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'resolve' && alertId) {
      alertSystem.resolveAlert(alertId);
      return NextResponse.json({
        success: true,
        message: 'Alert resolved',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
