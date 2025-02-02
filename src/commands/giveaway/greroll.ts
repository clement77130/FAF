import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('greroll')
  .setDescription('Relancer un giveaway')
  .addStringOption(option =>
    option.setName('messageid')
      .setDescription('L\'ID du message du giveaway')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      ephemeral: true
    });
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: 'Vous devez être administrateur pour utiliser cette commande.',
      ephemeral: true
    });
  }

  const messageId = interaction.options.getString('messageid', true);

  const giveaway = await prisma.giveaway.findUnique({
    where: { id: messageId },
    include: { participants: true }
  });


  
  if (!giveaway) {
    return interaction.reply({
      content: 'Giveaway introuvable.',
      ephemeral: true
    });
  }

  if (!giveaway.ended) {
    return interaction.reply({
      content: 'Ce giveaway n\'est pas encore terminé.',
      ephemeral: true
    });
  }

  const participants = giveaway.participants;
  if (participants.length === 0) {
    return interaction.reply({
      content: 'Aucun participant dans ce giveaway.',
      ephemeral: true
    });
  }

  const winners = [];
  const participantsCopy = [...participants];
  
  for (let i = 0; i < Math.min(giveaway.winners, participants.length); i++) {
    const winnerIndex = Math.floor(Math.random() * participantsCopy.length);
    winners.push(participantsCopy.splice(winnerIndex, 1)[0]);
  }

  const winnersList = await Promise.all(
    winners.map(async (winner) => {
      const user = await interaction.client.users.fetch(winner.userId);
      return user.toString();
    })
  );

  const rerollEmbed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle('🎉 Nouveaux Gagnants')
    .setDescription(`**Prix:** ${giveaway.prize}\n\n**Gagnants:** ${winnersList.join(', ')}`)
    .setTimestamp();

  await interaction.reply({ embeds: [rerollEmbed] });

  const congratsMessage = `Félicitations! Vous avez gagné le giveaway **${giveaway.prize}**!`;
  winners.forEach(async (winner) => {
    const user = await interaction.client.users.fetch(winner.userId);
    user.send(congratsMessage).catch(() => {});
  });
} 