import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch data from ve.dolarapi.com
    const response = await fetch('https://ve.dolarapi.com/v1/dolares', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Dolar API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // The API returns an array like:
    // [
    //   { "moneda": "USD", "fuente": "oficial", "promedio": 517.9619, ... },
    //   { "moneda": "USD", "fuente": "paralelo", "promedio": 706.81275, ... }
    // ]

    let oficialRate = 40; // Fallback
    let paraleloRate = 40; // Fallback
    let updatedAt = Date.now();

    if (Array.isArray(data)) {
      const oficial = data.find((d: any) => d.fuente === 'oficial');
      const paralelo = data.find((d: any) => d.fuente === 'paralelo');

      if (oficial?.promedio) oficialRate = oficial.promedio;
      if (paralelo?.promedio) paraleloRate = paralelo.promedio;
      
      if (paralelo?.fechaActualizacion || oficial?.fechaActualizacion) {
        updatedAt = new Date(paralelo?.fechaActualizacion || oficial?.fechaActualizacion).getTime();
      }
    }

    // Default return structure for CurrencyContext - Now using BCV Official Rate
    return NextResponse.json({
      base: 'BS',
      rates: {
        BS: 1.0,
        USD: oficialRate, // Enforce Official BCV rate as the default rate
      },
      sources: {
        oficial: oficialRate,
        paralelo: paraleloRate
      },
      updatedAt,
      source: 'api',
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    return NextResponse.json({
      base: 'BS',
      rates: {
        BS: 1.0,
        USD: 40.0,
      },
      sources: {
        oficial: 40.0,
        paralelo: 40.0
      },
      updatedAt: Date.now(),
      source: 'manual',
    }, { status: 500 }); // Still return 500 so client knows it's fallback
  }
}
