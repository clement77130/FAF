import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('admininvites')
  .setDescription('Gérer les invitations bonus d\'un utilisateur')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Ajouter des invitations bonus à un utilisateur')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('L\'utilisateur à qui ajouter les invitations')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Le nombre d\'invitations à ajouter')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Retirer des invitations bonus à un utilisateur')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('L\'utilisateur à qui retirer les invitations')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Le nombre d\'invitations à retirer')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Vous devez être administrateur pour utiliser cette commande.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    await prisma.guild.upsert({
      where: { id: interaction.guildId! },
      create: {
        id: interaction.guildId!,
        moderationRoles: '[]'
      },
      update: {}
    });

    let invite = await prisma.invite.findFirst({
      where: {
        guildId: interaction.guildId!,
        inviterId: targetUser.id,
        id: 'bonus'
      }
    });

    if (!invite) {
      invite = await prisma.invite.create({
        data: {
          id: 'bonus',
          guildId: interaction.guildId!,
          inviterId: targetUser.id,
          uses: 0,
          left: 0,
          fake: 0,
          bonus: 0
        }
      });
    }
    if (subcommand === 'remove' && amount > invite.bonus) {
      await interaction.reply({
        content: `❌ ${targetUser.username} n'a que ${invite.bonus} invitation${invite.bonus > 1 ? 's' : ''} bonus.`,
        ephemeral: true
      });
      return;
    }

    const updatedInvite = await prisma.invite.updateMany({
      where: {
        id: 'bonus',
        guildId: interaction.guildId!,
        inviterId: targetUser.id
      },
      data: {
        bonus: subcommand === 'add' 
          ? { increment: amount }
          : { decrement: amount }
      }
    });
    const finalInvite = await prisma.invite.findFirst({
      where: {
        id: 'bonus',
        guildId: interaction.guildId!,
        inviterId: targetUser.id
      }
    });

    if (!finalInvite) {
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la mise à jour des invitations bonus.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(subcommand === 'add' ? '#00ff00' : '#ff0000')
      .setTitle(`${subcommand === 'add' ? '➕' : '➖'} Invitations bonus ${subcommand === 'add' ? 'ajoutées' : 'retirées'}`)
      .setDescription(
        `${amount} invitation${amount > 1 ? 's' : ''} ${subcommand === 'add' ? 'ajoutée' : 'retirée'}${amount > 1 ? 's' : ''} à ${targetUser}\n` +
        `Nouveau total d'invitations bonus: ${finalInvite.bonus}`
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('❌ Erreur dans la commande admininvites:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
      flags: MessageFlags.Ephemeral
    });
  }
} 