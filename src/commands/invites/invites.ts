import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface InviteData {
  uses: number;
  left: number;
  fake: number;
  bonus: number;
}

interface InviteStats {
  total: number;
  totalRegular: number;
  totalLeft: number;
  totalFake: number;
  totalBonus: number;
}

export const data = new SlashCommandBuilder()
  .setName('invites')
  .setDescription('Voir vos statistiques d\'invitations')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('L\'utilisateur dont vous voulez voir les statistiques')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const invites = await prisma.invite.findMany({
      where: {
        guildId: interaction.guildId!,
        inviterId: targetUser.id
      }
    });

    const stats = invites.reduce((acc: InviteStats, invite: InviteData) => ({
      total: acc.total + (invite.uses - invite.left - invite.fake + invite.bonus),
      totalRegular: acc.totalRegular + invite.uses,
      totalLeft: acc.totalLeft + invite.left,
      totalFake: acc.totalFake + invite.fake,
      totalBonus: acc.totalBonus + invite.bonus
    }), {
      total: 0,
      totalRegular: 0,
      totalLeft: 0,
      totalFake: 0,
      totalBonus: 0
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Statistiques d\'invitations')
      .setDescription(`Voici les statistiques d'invitations de ${targetUser}:`)
      .addFields(
        { name: '📥 Invitations actives', value: `${stats.total}`, inline: true },
        { name: '📋 Invitations totales', value: `${stats.totalRegular}`, inline: true },
        { name: '❌ Membres partis', value: `${stats.totalLeft}`, inline: true },
        { name: '🤖 Comptes suspects', value: `${stats.totalFake}`, inline: true },
        { name: '🎁 Invitations bonus', value: `${stats.totalBonus}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('❌ Erreur dans la commande invites:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
      flags: MessageFlags.Ephemeral
    });
  }
} 