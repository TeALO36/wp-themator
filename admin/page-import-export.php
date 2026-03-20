<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Handle JSON import
if ( isset( $_POST['themator_import_nonce'] ) && wp_verify_nonce( $_POST['themator_import_nonce'], 'themator_import' ) ) {
    if ( ! empty( $_FILES['tmator_import_file']['tmp_name'] ) ) {
        $json = file_get_contents( $_FILES['tmator_import_file']['tmp_name'] );
        $data = json_decode( $json, true );
        if ( $data && isset( $data['layouts'] ) ) {
            $imported = 0;
            foreach ( $data['layouts'] as $layout ) {
                if ( empty( $layout['title'] ) || empty( $layout['data'] ) ) continue;
                $id = wp_insert_post( array(
                    'post_type'   => 'tmator_layout',
                    'post_title'  => sanitize_text_field( $layout['title'] ),
                    'post_status' => 'publish',
                ) );
                if ( $id && ! is_wp_error( $id ) ) {
                    update_post_meta( $id, '_themator_data', wp_slash( $layout['data'] ) );
                    $imported++;
                }
            }
            echo '<div class="tm-notice tm-notice-success">✅ ' . sprintf( esc_html__( '%d modèle(s) importé(s) avec succès.', 'themator' ), $imported ) . '</div>';
        } else {
            echo '<div class="tm-notice tm-notice-warning">⚠️ ' . esc_html__( 'Fichier JSON invalide ou vide.', 'themator' ) . '</div>';
        }
    }
}
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header( __( 'Import / Export', 'themator' ) ); ?>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">

        <!-- Export -->
        <div class="tm-admin-section">
            <h2>📤 <?php esc_html_e( 'Exporter vos modèles', 'themator' ); ?></h2>
            <p style="font-size:13px; color:#666; margin-bottom:20px;">
                <?php esc_html_e( 'Télécharge tous vos modèles de la bibliothèque au format JSON. Réimportez-les sur n\'importe quel site Themator.', 'themator' ); ?>
            </p>
            <a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-ajax.php?action=themator_export_layouts' ), 'themator_export' ) ); ?>"
               class="tm-btn tm-btn-primary">
                ⬇️ <?php esc_html_e( 'Télécharger l\'export JSON', 'themator' ); ?>
            </a>
        </div>

        <!-- Import -->
        <div class="tm-admin-section">
            <h2>📥 <?php esc_html_e( 'Importer des modèles', 'themator' ); ?></h2>
            <p style="font-size:13px; color:#666; margin-bottom:16px;">
                <?php esc_html_e( 'Importez un fichier JSON exporté depuis un autre site Themator.', 'themator' ); ?>
            </p>
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field( 'themator_import', 'themator_import_nonce' ); ?>
                <label class="tm-upload-zone" for="tmator_import_file">
                    <div style="font-size:36px;">📁</div>
                    <p><?php esc_html_e( 'Cliquez pour choisir un fichier JSON', 'themator' ); ?></p>
                    <input type="file" id="tmator_import_file" name="tmator_import_file" accept=".json" style="display:none;">
                    <span id="tmator-file-name" style="font-size:12px; color:#999; margin-top:8px;"><?php esc_html_e( 'Aucun fichier sélectionné', 'themator' ); ?></span>
                </label>
                <button type="submit" class="tm-btn tm-btn-success">
                    ⬆️ <?php esc_html_e( 'Importer', 'themator' ); ?>
                </button>
            </form>
        </div>
    </div>
</div>

<script>
document.getElementById('tmator_import_file').addEventListener('change', function() {
    var name = this.files[0] ? this.files[0].name : '<?php esc_html_e( 'Aucun fichier sélectionné', 'themator' ); ?>';
    document.getElementById('tmator-file-name').textContent = name;
});
</script>
