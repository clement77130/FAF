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
  inviterId: string;
  total: number;
  totalRegular: number;
  totalLeft: number;
  totalFake: number;
  totalBonus: number;
}

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Voir le classement des invitations');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const invites = await prisma.invite.groupBy({
      by: ['inviterId'],
      _sum: {
        uses: true,
        left: true,
        fake: true,
        bonus: true
      },
      where: {
        guildId: interaction.guildId!
      }
    });

    const inviteStats = invites.map((invite: any): InviteStats => ({
      inviterId: invite.inviterId,
      total: (invite._sum.uses || 0) - (invite._sum.left || 0) - (invite._sum.fake || 0) + (invite._sum.bonus || 0),
      totalRegular: invite._sum.uses || 0,
      totalLeft: invite._sum.left || 0,
      totalFake: invite._sum.fake || 0,
      totalBonus: invite._sum.bonus || 0
    }));

    const sortedInvites = inviteStats
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Classement des invitations')
      .setDescription('Voici le classement des invitations :');

    if (sortedInvites.length === 0) {
      embed.setDescription('Aucune invitation n\'a été enregistrée pour le moment.');
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    }

    const leaderboard = await Promise.all(
      sortedInvites.map(async (invite: any, index: number) => {
        const member = interaction.guild?.members.cache.get(invite.inviterId);
        return `${index + 1}. ${member ? member.user.tag : 'Utilisateur inconnu'} - ${invite.total} invitation${invite.total > 1 ? 's' : ''} (${invite.totalRegular} total, ${invite.totalLeft} partis, ${invite.totalFake} suspects, ${invite.totalBonus} bonus)`;
      })
    );

    embed.setDescription('Voici le classement des invitations :\n\n' + leaderboard.join('\n'));

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('❌ Erreur dans la commande leaderboard:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
      flags: MessageFlags.Ephemeral
    });
  }
} 