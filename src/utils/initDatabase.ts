import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

export async function initDatabase() {
  try {
    console.log('🔄 Initialisation de la base de données...');

    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      console.log('📁 Création du dossier data...');
      mkdirSync(dataDir);
    }
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');

    return prisma;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données :', error);
    throw error;
  }
} 