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

export async function handleReopen(interaction: ButtonInteraction<'cached'>) {
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

  if (ticket.status === 'open') {
    return interaction.editReply({
      content: 'Ce ticket est déjà ouvert.'
    });
  }

  try {
    const channel = interaction.channel as TextChannel;
    if (channel && channel.type === ChannelType.GuildText) {
      const parts = channel.name.split('-');
      if (parts.length >= 2) {
        const newName = `${parts[0]}-${parts[1]}-ouvert`;

        await channel.permissionOverwrites.edit(ticket.userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { 
            status: 'open',
            channelId: interaction.channelId
          }
        });

        const reopenEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Ticket Réouvert')
          .setDescription(`Ticket réouvert par ${interaction.user.tag}`)
          .setTimestamp();

        await channel.send({
          content: `<@${ticket.userId}>`,
          embeds: [reopenEmbed]
        });

        const ticketEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`Ticket - ${parts[0]}`)
          .setDescription(
            'Un membre du staff vous répondra dès que possible.\n' +
            'Pour fermer le ticket, utilisez la commande `/close` ou le bouton ci-dessous.'
          )
          .setTimestamp();

        const closeButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('ticket_close')
              .setLabel('Fermer le ticket')
              .setStyle(ButtonStyle.Danger)
          );

        await channel.send({
          embeds: [ticketEmbed],
          components: [closeButton]
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
          content: 'Le ticket a été réouvert.'
        });
      } else {
        await interaction.editReply({
          content: 'Le ticket a été réouvert (impossible de renommer le canal).'
        });
      }
    }
  } catch (error) {
    console.error('[ERROR] Error during ticket reopen:', error);
    await interaction.editReply({
      content: 'Une erreur est survenue lors de la réouverture du ticket.'
    });
  }
} 