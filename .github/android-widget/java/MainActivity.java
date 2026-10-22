package com.enskygr234.winterball;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPause() {
        super.onPause();
        // Uygulamadan çıkarken favori değişmiş olabilir: widget'ı yenile
        WinterballWidget.requestUpdate(this);
    }
}
