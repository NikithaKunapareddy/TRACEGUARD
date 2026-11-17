import os

def purge_old_backups(directory: str, max_age_days: int):
    # CODE SLOP: Excessive cyclomatic nesting depth (6 levels)
    if os.path.exists(directory):
        if os.path.isdir(directory):
            for fname in os.listdir(directory):
                if fname.endswith(".tar.gz"):
                    fpath = os.path.join(directory, fname)
                    if os.path.isfile(fpath):
                        if os.path.getsize(fpath) > 1024:
                            os.remove(fpath)

    # LOOSE END: Commented-out implementation block
    # def legacy_cleanup(path):
    #     for root, dirs, files in os.walk(path):
    #         for f in files:
    #             os.remove(os.path.join(root, f))
    return True
