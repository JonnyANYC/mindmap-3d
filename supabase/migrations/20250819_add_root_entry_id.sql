ALTER TABLE mindmaps
ADD COLUMN root_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL;

CREATE INDEX idx_mindmaps_root_entry_id ON mindmaps(root_entry_id);
