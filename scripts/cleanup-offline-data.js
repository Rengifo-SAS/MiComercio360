#!/usr/bin/env node

/**
 * Script de utilidad para limpiar y migrar datos offline del POS
 * Uso: node scripts/cleanup-offline-data.js [comando]
 * 
 * Comandos disponibles:
 * - stats: Mostrar estadísticas de datos offline
 * - clean: Limpiar datos corruptos
 * - migrate: Migrar ventas sin company_id
 * - all: Ejecutar limpieza completa
 */

import { OfflineDataCleanupService } from '../lib/services/offline-cleanup-service.js';

const COMPANY_ID = process.env.DEFAULT_COMPANY_ID || 'e8593897-b2de-4814-8eaa-f4830e8e60d2';

async function showStats() {
    console.log('📊 Obteniendo estadísticas de datos offline...');
    const stats = await OfflineDataCleanupService.getOfflineStats();

    if (!stats) {
        console.log('❌ No se pudieron obtener las estadísticas');
        return;
    }

    console.log('\n📈 Estadísticas de Ventas Offline:');
    console.log(`   Total de ventas: ${stats.total}`);
    console.log(`   Ventas válidas: ${stats.valid} ✅`);
    console.log(`   Con company_id: ${stats.withCompanyId} ✅`);
    console.log(`   Sin company_id: ${stats.withoutCompanyId} ⚠️`);
    console.log(`   Datos corruptos: ${stats.corrupted} ❌`);

    const percentage = stats.total > 0 ? (stats.valid / stats.total * 100).toFixed(1) : 0;
    console.log(`\n✨ Integridad de datos: ${percentage}%`);

    if (stats.withoutCompanyId > 0) {
        console.log(`\n⚠️  Se encontraron ${stats.withoutCompanyId} ventas sin company_id que pueden migrarse.`);
    }

    if (stats.corrupted > 0) {
        console.log(`\n❌ Se encontraron ${stats.corrupted} ventas con datos corruptos que deben eliminarse.`);
    }
}

async function cleanCorrupted() {
    console.log('🧹 Iniciando limpieza de datos corruptos...');

    try {
        await OfflineDataCleanupService.cleanupCorruptedSales();
        console.log('✅ Limpieza de datos corruptos completada');
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error.message);
    }
}

async function migrateOldSales() {
    console.log('🔄 Iniciando migración de ventas sin company_id...');
    console.log(`   Usando company_id: ${COMPANY_ID}`);

    try {
        await OfflineDataCleanupService.migrateOldSales(COMPANY_ID);
        console.log('✅ Migración completada');
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
    }
}

async function fullCleanup() {
    console.log('🚀 Iniciando limpieza completa de datos offline...\n');

    console.log('1️⃣ Mostrando estadísticas iniciales:');
    await showStats();

    console.log('\n2️⃣ Migrando ventas sin company_id:');
    await migrateOldSales();

    console.log('\n3️⃣ Limpiando datos corruptos:');
    await cleanCorrupted();

    console.log('\n4️⃣ Estadísticas finales:');
    await showStats();

    console.log('\n🎉 Limpieza completa terminada!');
}

function showHelp() {
    console.log(`
🛠️  Utilidad de Limpieza de Datos Offline POS

Uso: node scripts/cleanup-offline-data.js [comando]

Comandos disponibles:
  stats     Mostrar estadísticas de datos offline
  clean     Limpiar datos corruptos
  migrate   Migrar ventas sin company_id
  all       Ejecutar limpieza completa
  help      Mostrar esta ayuda

Variables de entorno:
  DEFAULT_COMPANY_ID    ID de la empresa por defecto para migración

Ejemplos:
  node scripts/cleanup-offline-data.js stats
  node scripts/cleanup-offline-data.js migrate
  DEFAULT_COMPANY_ID=mi-company-id node scripts/cleanup-offline-data.js all
`);
}

// Función principal
async function main() {
    const command = process.argv[2];

    if (!command || command === 'help') {
        showHelp();
        return;
    }

    try {
        switch (command) {
            case 'stats':
                await showStats();
                break;
            case 'clean':
                await cleanCorrupted();
                break;
            case 'migrate':
                await migrateOldSales();
                break;
            case 'all':
                await fullCleanup();
                break;
            default:
                console.log(`❌ Comando desconocido: ${command}`);
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error ejecutando comando:', error);
        process.exit(1);
    }
}

// Solo ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { showStats, cleanCorrupted, migrateOldSales, fullCleanup };