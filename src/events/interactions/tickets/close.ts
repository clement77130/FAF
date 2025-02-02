import { 
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleClose(interaction: ButtonInteraction<'cached'>) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await prisma.ticket.findFirst({
    where: { 
      OR: [
        { id: interaction.channelId },
        { channelId: interaction.channelId }
      ]
    }
  });

  if (!ticket) {
    return interaction.editReply({
      content: 'Ce ticket n\'existe pas dans la base de données.'
    });
  }

  if (ticket.status === 'closed') {
    return interaction.editReply({
      content: 'Ce ticket est déjà fermé.'
    });
  }

  const confirmRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_confirm')
        .setLabel('Confirmer la fermeture')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_close_cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.editReply({
    content: 'Êtes-vous sûr de vouloir fermer ce ticket ?',
    components: [confirmRow]
  });
}

export async function handleCloseConfirm(interaction: ButtonInteraction<'cached'>) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await prisma.ticket.findFirst({
    where: { 
      OR: [
        { id: interaction.channelId },
        { channelId: interaction.channelId }
      ]
    }
  });

  if (!ticket) {
    return interaction.editReply({
      content: 'Ce ticket n\'existe pas dans la base de données.'
    });
  }

  if (ticket.status === 'closed') {
    return interaction.editReply({
      content: 'Ce ticket est déjà fermé.'
    });
  }

  try {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { 
        status: 'closed',
        channelId: interaction.channelId
      }
    });

    const channel = interaction.channel as TextChannel;
    if (channel && channel.type === ChannelType.GuildText) {
      const parts = channel.name.split('-');
      if (parts.length >= 2) {
        const newName = `${parts[0]}-${parts[1]}-fermé`;
        
        const closeEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Ticket Fermé')
          .setDescription(`Ticket fermé par ${interaction.user.tag}`)
          .setTimestamp();

        const archiveRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket_delete')
              .setLabel('Supprimer le ticket')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('ticket_reopen')
              .setLabel('Réouvrir le ticket')
              .setStyle(ButtonStyle.Success)
          );

        await channel.send({
          embeds: [closeEmbed],
          components: [archiveRow]
        });

        await channel.permissionOverwrites.edit(ticket.userId, {
          SendMessages: false
        });

        try {
          const renamePromise = channel.setName(newName);
          await Promise.race([
            renamePromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
        } catch (error) {
          console.error('[ERROR] Failed to rename channel (continuing anyway):', error);
        }

        await interaction.editReply({
          content: 'Le ticket a été fermé.'
        });
      } else {
        await interaction.editReply({
          content: 'Le ticket a été fermé (impossible de renommer le canal).'
        });
      }
    }
  } catch (error) {
    console.error('[ERROR] Error during ticket close:', error);
    await interaction.editReply({
      content: 'Une erreur est survenue lors de la fermeture du ticket.'
    });
  }
}

export async function handleCloseCancel(interaction: ButtonInteraction<'cached'>) {
  await interaction.update({
    content: 'Fermeture du ticket annulée.',
    components: []
  });
} 