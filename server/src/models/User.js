const bcrypt = require('bcryptjs');
const supabase = require('../config/db');

class User {
  constructor(data) {
    this.user_id = data.user_id || data.id;
    this.google_id = data.google_id;
    this.email = data.email;
    this.username = data.username;
    this.avatar_url = data.avatar_url;
    this.last_active = data.last_active;
    this.password = data.password;
    this.profile_image_url = data.profile_image_url || '/assets/default-avatar.png';
    this.last_login = data.last_login;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static method to find user by ID
  static async findByPk(user_id) {
    if (!user_id) return null;
    
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) {
      console.error('Error finding user:', error);
      return null;
    }
    return data ? new User(data) : null;
  }

  // Static method to find user by email
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data ? new User(data) : null;
  }

  // Static method to find user by Google ID
  static async findByGoogleId(google_id) {
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('google_id', google_id)
      .single();

    if (error) throw error;
    return data ? new User(data) : null;
  }

  // Static method to create a new user
  static async create(userData) {
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const { data, error } = await supabase
      .from('Users')
      .insert([{
        ...userData,
        last_active: new Date(),
        last_login: new Date()
      }])
      .select()
      .single();

    if (error) throw error;
    return new User(data);
  }

  // Instance method to update user
  async update(updateData) {
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const { data, error } = await supabase
      .from('Users')
      .update(updateData)
      .eq('user_id', this.user_id)
      .select()
      .single();

    if (error) throw error;
    return new User(data);
  }

  // Instance method to verify password
  async verifyPassword(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  // Instance method to save user
  async save() {
    const { data, error } = await supabase
      .from('Users')
      .update(this)
      .eq('user_id', this.user_id)
      .select()
      .single();

    if (error) throw error;
    return new User(data);
  }
}

module.exports = User;