CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();