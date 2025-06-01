import { NextRequest, NextResponse } from "next/server";
import { getHealthStatus } from "../../../lib/startup";

export async function GET(request: NextRequest) {
  try {
    const healthData = await getHealthStatus();

    const statusCode =
      healthData.status === "healthy"
        ? 200
        : healthData.status === "unhealthy"
        ? 503
        : 500;

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
