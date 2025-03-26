-- Drop existing tables
DROP TABLE IF EXISTS "games" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

-- Create Users table
CREATE TABLE "Users" (
    "user_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255),
    "username" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "last_active" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE "games" (
    "game_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL REFERENCES "Users"("user_id"),
    "opponent_id" UUID REFERENCES "Users"("user_id"),
    "status" VARCHAR(50) NOT NULL DEFAULT 'waiting',
    "is_private" BOOLEAN DEFAULT false,
    "invite_code" VARCHAR(10) UNIQUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP WITH TIME ZONE,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "winner_id" UUID REFERENCES "Users"("user_id")
);

-- Create indexes
CREATE INDEX idx_users_email ON "Users"("email");
CREATE INDEX idx_games_creator_id ON "games"("creator_id");
CREATE INDEX idx_games_opponent_id ON "games"("opponent_id");
CREATE INDEX idx_games_status ON "games"("status");
CREATE INDEX idx_games_invite_code ON "games"("invite_code");

-- Enable Row Level Security
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
    ON "Users" FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON "Users" FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public games"
    ON "games" FOR SELECT
    USING (NOT is_private OR creator_id = auth.uid() OR opponent_id = auth.uid());

CREATE POLICY "Users can create games"
    ON "games" FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own games"
    ON "games" FOR UPDATE
    USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for Users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "Users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 