import { 
  Events, 
  ButtonInteraction, 
} from 'discord.js';
import * as ticketHandlers from './interactions/tickets';
import * as giveawayHandlers from './interactions/giveaways';

export const name = Events.InteractionCreate;

export async function execute(interaction: ButtonInteraction<'cached'>) {
  if (!interaction.isButton()) return;
  switch (interaction.customId) {
    case 'ticket_close':
      await ticketHandlers.handleClose(interaction);
      break;
    case 'ticket_close_confirm':
      await ticketHandlers.handleCloseConfirm(interaction);
      break;
    case 'ticket_close_cancel':
      await ticketHandlers.handleCloseCancel(interaction);
      break;
    case 'ticket_reopen':
      await ticketHandlers.handleReopen(interaction);
      break;
    case 'ticket_delete':
      await ticketHandlers.handleDelete(interaction);
      break;
    case 'giveaway_enter':
      await giveawayHandlers.handleEnter(interaction);
      break;
  }
} 