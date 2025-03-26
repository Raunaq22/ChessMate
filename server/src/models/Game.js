const supabase = require('../config/db');

class Game {
  constructor(data) {
    this.game_id = data.game_id;
    this.white_player_id = data.white_player_id;
    this.black_player_id = data.black_player_id;
    this.status = data.status;
    this.winner = data.winner;
    this.result = data.result;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static method to find game by ID
  static async findByPk(game_id) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', game_id)
      .single();

    if (error) throw error;
    return data ? new Game(data) : null;
  }

  // Static method to find active games for a user
  static async findActiveGames(user_id) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .or(`white_player_id.eq.${user_id},black_player_id.eq.${user_id}`)
      .eq('status', 'active');

    if (error) throw error;
    return data.map(game => new Game(game));
  }

  // Static method to create a new game
  static async create(gameData) {
    const { data, error } = await supabase
      .from('games')
      .insert([{
        ...gameData,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return new Game(data);
  }

  // Instance method to update game
  async update(updateData) {
    const { data, error } = await supabase
      .from('games')
      .update(updateData)
      .eq('game_id', this.game_id)
      .select()
      .single();

    if (error) throw error;
    return new Game(data);
  }

  // Instance method to save game
  async save() {
    const { data, error } = await supabase
      .from('games')
      .update(this)
      .eq('game_id', this.game_id)
      .select()
      .single();

    if (error) throw error;
    return new Game(data);
  }

  // Instance method to get game moves
  async getMoves() {
    const { data, error } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', this.game_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Instance method to get chat messages
  async getChatMessages() {
    const { data, error } = await supabase
      .from('game_chat')
      .select('*')
      .eq('game_id', this.game_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = Game;