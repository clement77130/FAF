import { Events, GuildMember, EmbedBuilder, AuditLogEvent } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(member: GuildMember) {
  try {
    console.log('👋 Membre parti:', member.user.tag, '(ID:', member.id, ')');
    console.log('📝 Serveur:', member.guild.name, '(ID:', member.guild.id, ')');

    console.log('🔍 Recherche de l\'invitation dans la base de données...');
    const memberInvite = await prisma.memberJoin.findFirst({
      where: {
        memberId: member.id,
        guildId: member.guild.id
      },
      include: {
        invite: true
      }
    });

    if (memberInvite) {
      console.log('✅ Invitation trouvée:');
      console.log('- ID de l\'invitation:', memberInvite.inviteId);
      console.log('- ID de l\'inviteur:', memberInvite.invite.inviterId);
      console.log('- Compteurs actuels:', {
        uses: memberInvite.invite.uses,
        left: memberInvite.invite.left,
        fake: memberInvite.invite.fake
      });

      const updatedInvite = await prisma.invite.update({
        where: {
          id_guildId: {
            id: memberInvite.inviteId,
            guildId: member.guild.id
          }
        },
        data: {
          left: { increment: 1 }
        }
      });
      console.log('✅ Compteurs mis à jour:', {
        uses: updatedInvite.uses,
        left: updatedInvite.left,
        fake: updatedInvite.fake
      });
    } else {
      console.log('❌ Aucune invitation trouvée dans la base de données');
      
      const allMemberJoins = await prisma.memberJoin.findMany({
        where: {
          guildId: member.guild.id
        },
        include: {
          invite: true
        }
      });
      console.log('📊 Entrées MemberJoin existantes pour ce serveur:', 
        allMemberJoins.map((mj: { memberId: string; inviteId: string; invite: { inviterId: string } }) => ({
          memberId: mj.memberId,
          inviteId: mj.inviteId,
          inviterId: mj.invite.inviterId
        }))
      );
    }

    const auditLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberKick
    });

    const kickLog = auditLogs.entries.first();
    const wasKicked = kickLog && kickLog.target?.id === member.id && 
      kickLog.createdTimestamp > (Date.now() - 5000); // Dans les 5 dernières secondes

    const banLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberBanAdd
    });

    const banLog = banLogs.entries.first();
    const wasBanned = banLog && banLog.target?.id === member.id &&
      banLog.createdTimestamp > (Date.now() - 5000);

    let leaveReason = 'a quitté';
    if (wasKicked) leaveReason = 'a été expulsé';
    if (wasBanned) leaveReason = 'a été banni';

    const guildData = await prisma.guild.findUnique({
      where: { id: member.guild.id }
    });

    if (guildData?.logChannelId) {
      const logChannel = member.guild.channels.cache.get(guildData.logChannelId);
      if (logChannel?.isTextBased()) {
        const leaveEmbed = new EmbedBuilder()
          .setColor(wasBanned ? '#ff0000' : wasKicked ? '#ffa500' : '#808080')
          .setTitle('👋 Membre parti')
          .setThumbnail(member.user.displayAvatarURL())
          .setDescription(
            `**${member.user.tag}** ${leaveReason} le serveur.\n` +
            (memberInvite ? `**Invité par:** <@${memberInvite.invite.inviterId}>\n` : '**Inviteur:** Inconnu\n') +
            (wasKicked && kickLog ? `**Expulsé par:** ${kickLog.executor}\n**Raison:** ${kickLog.reason || 'Aucune raison spécifiée'}` :
            wasBanned && banLog ? `**Banni par:** ${banLog.executor}\n**Raison:** ${banLog.reason || 'Aucune raison spécifiée'}` : '')
          )
          .setTimestamp();

        await logChannel.send({ embeds: [leaveEmbed] });
        console.log('✅ Message de log envoyé');
      } else {
        console.log('❌ Canal de log non trouvé ou non textuel');
      }
    } else {
      console.log('ℹ️ Aucun canal de log configuré');
    }

    console.log(`✅ Départ de ${member.user.tag} traité (${leaveReason})`);
  } catch (error) {
    console.error('❌ Erreur dans guildMemberRemove:', error);
    console.error(error);
  }
} 