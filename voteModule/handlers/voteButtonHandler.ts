import { ButtonInteraction, Client, EmbedBuilder } from 'discord.js';
import { getActiveVote, VoteEntry, numberEmojis } from '../voteManager';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export async function handleVoteButton(interaction: ButtonInteraction, client: Client): Promise<void> {
  logger.info({ userId: interaction.user.id }, 'Vote button clicked');
  
  try {
    const [action, index] = interaction.customId.split('_');
    if (action !== 'vote') return;

    const voteData = getActiveVote(interaction.channelId);
    if (!voteData) {
      await interaction.reply({ content: 'This vote has ended.', ephemeral: true });
      return;
    }

    if (Date.now() > voteData.endTime) {
      await interaction.reply({ content: 'This vote has ended.', ephemeral: true });
      return;
    }

    const entry = voteData.entries[parseInt(index)];
    if (!entry) {
      await interaction.reply({ content: 'Invalid vote option.', ephemeral: true });
      return;
    }

    // Remove previous vote if exists
    voteData.entries.forEach(e => e.votes.delete(interaction.user.id));
    
    // Add new vote
    entry.votes.add(interaction.user.id);

    // Update the embed with current vote counts
    const embed = new EmbedBuilder()
      .setTitle('🗳️ Vote for your favorite image!')
      .setDescription(`Voting ends <t:${Math.floor(voteData.endTime / 1000)}:R>\nThe winning image will be tweeted! 🐦`)
      .setColor('#00acee');

    voteData.entries.forEach((entry, idx) => {
      embed.addFields({
        name: `${numberEmojis[idx]} Image ${entry.number} (${entry.votes.size} votes)`,
        value: `Prompt: ${entry.prompt}`
      });
    });

    // Update the original message
    await interaction.message.edit({
      embeds: [embed]
    });

    // Send ephemeral confirmation to the voter
    await interaction.reply({ 
      content: `You voted for Image ${entry.number}! Current votes: ${entry.votes.size}`, 
      ephemeral: true 
    });

    logger.info({
      userId: interaction.user.id,
      imageNumber: entry.number,
      channelId: interaction.channelId,
      voteCount: entry.votes.size
    }, 'Vote recorded and display updated');

  } catch (error) {
    logger.error({ error }, 'Error handling vote button');
    await interaction.reply({ 
      content: 'An error occurred while processing your vote.', 
      ephemeral: true 
    });
  }
} 