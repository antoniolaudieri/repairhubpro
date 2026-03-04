
-- Create a trigger that automatically syncs current_price and bid_count on auction_items
-- whenever a new bid is inserted into auction_bids
CREATE OR REPLACE FUNCTION public.sync_auction_bid_to_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE auction_items
  SET current_price = NEW.amount,
      bid_count = COALESCE((SELECT COUNT(*) FROM auction_bids WHERE item_id = NEW.item_id), 0)
  WHERE id = NEW.item_id
    AND (current_price < NEW.amount OR current_price IS NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_bid_to_item
AFTER INSERT ON public.auction_bids
FOR EACH ROW
EXECUTE FUNCTION public.sync_auction_bid_to_item();
