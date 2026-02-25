package com.resonance.server.data.tags;

/**
 * @author John 2/16/2026
 */
public class Instrument extends Tag {
	
	private final int instrumentID;
	
	public Instrument(int instrumentID, int tagID, String name) {
		super(tagID, name);
		this.instrumentID = instrumentID;
	}
	
	public int getInstrumentID() {
		return this.instrumentID;
	}
	
}
